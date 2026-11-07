import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Check, DateRow, Empty, GlassButton, Icon, Marks, Row, Screen, Section, Segmented, Sheet, Stars, TextRow, ToggleRow, VisibilityFields, haptic, toast } from '../ui'
import { fmtDate, today } from '../lib/date'
import type { TKey } from '../i18n'
import { guessCategory } from '../lib/categories'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/widget'
import type { Cook, Recipe } from '../types'

const MEALS = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack'] as const
const MEAL_EMOJI: Record<(typeof MEALS)[number], string> = { breakfast: '🥞', lunch: '🍲', dinner: '🍝', dessert: '🍰', snack: '🥪' }
const rating = (r: Recipe) => { const x = (r.cooks ?? []).filter((c) => c.rating).map((c) => c.rating!); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0 }
const lastCook = (r: Recipe) => [...(r.cooks ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
import { CoverBox, CoverPicker, relink } from '../cover'

/** Title, photo, ingredients and steps from a recipe page (schema.org data, read on our server). */
async function importRecipe(url: string): Promise<Partial<Recipe> | null> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return null
  const r = await fetch(`${API_BASE}/recipe?url=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()).catch(() => null)
  if (!r || r.error || (!r.title && !r.ingredients?.length)) return null
  return { title: r.title, image: r.image, ingredients: r.ingredients ?? [], steps: r.steps ?? [], minutes: r.minutes, servings: r.servings }
}

export default function Recipes({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const [tag, setTag] = useState<string | null>(null)
  const [edit, setEdit] = useState<Recipe | null>(null)
  const [cook, setCook] = useState<Recipe | null>(null)
  const [roulette, setRoulette] = useState(false)
  const all = visible(s.recipes, s.me)
  const tags = [...new Set(all.flatMap((r) => r.tags))].sort()
  const meals = MEALS.filter((m) => all.some((r) => r.meal === m))
  const list = all.filter((r) => (tag === '__someday' ? r.someday : tag === '__fav' ? r.favorite : tag?.startsWith('__meal:') ? r.meal === tag.slice(7) : !tag || r.tags.includes(tag)))
  const regular = list.filter((r) => !r.someday || tag === '__someday')
  const someday = tag === '__someday' ? [] : list.filter((r) => r.someday)

  const card = (r: Recipe) => (
    <button key={r.id} className="recipe-card" onClick={() => setEdit(r)}>
      <CoverBox className="rc-img" src={r.image} fallback={<span>{r.someday ? '🕸️' : '🍳'}</span>}>
        {r.cooked > 0 && <span className="rc-badge">👩‍🍳 {r.cooked}{rating(r) ? ` · ★ ${rating(r).toFixed(1)}` : ''}</span>}
        {r.favorite && <span className="rc-fav">⭐</span>}
      </CoverBox>
      <div className="rc-title">{r.title} <Marks x={r} /></div>
      <div className="rc-sub">{[r.meal && MEAL_EMOJI[r.meal], r.minutes && t('minutesN', { n: r.minutes }), r.difficulty && '🔪'.repeat(r.difficulty), ...r.tags.slice(0, 2).map((x) => '#' + x)].filter(Boolean).join(' · ')}</div>
    </button>
  )

  return (
    <Screen title={moduleLabel(s, 'recipes').title} back={back} accent="recipes"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), title: '', tags: [], ingredients: [], someday: false, cooked: 0 })} />}
      actions={all.length > 1 ? [{ icon: '🎲', label: t('rc.roulette'), onClick: () => setRoulette(true) }] : undefined}
      head={<div className="chips" style={{ paddingTop: 0 }}>
        <button className={'chip' + (!tag ? ' on' : '')} onClick={() => setTag(null)}>{t('all')}</button>
        {all.some((r) => r.favorite) && <button className={'chip' + (tag === '__fav' ? ' on' : '')} onClick={() => setTag('__fav')}>⭐ {t('rc.fav')}</button>}
        {meals.map((m) => <button key={m} className={'chip' + (tag === '__meal:' + m ? ' on' : '')} onClick={() => setTag('__meal:' + m)}>{MEAL_EMOJI[m]} {t(`rc.meal.${m}` as TKey)}</button>)}
        <button className={'chip' + (tag === '__someday' ? ' on' : '')} onClick={() => setTag('__someday')}>🕸️ {t('someday')}</button>
        {tags.map((x) => <button key={x} className={'chip' + (tag === x ? ' on' : '')} onClick={() => setTag(x)}>#{x}</button>)}
      </div>}>
      {list.length === 0 && <Empty emoji="🍳" text={t('empty')} />}
      {regular.length > 0 && <div className="recipe-grid">{regular.map(card)}</div>}
      {someday.length > 0 && <>
        <div className="section-header" style={{ padding: '6px 30px 8px' }}><span>🕸️ {t('someday')}</span></div>
        <div className="recipe-grid">{someday.map(card)}</div>
      </>}
      {edit && <RecipeEditor recipe={edit} onClose={() => setEdit(null)} onCook={(r) => { setEdit(null); setCook(r) }} />}
      {cook && <CookMode recipe={cook} onClose={() => setCook(null)} />}
      {roulette && <RouletteSheet recipes={all} onOpen={(r) => { setRoulette(false); setEdit(r) }} onClose={() => setRoulette(false)} />}
    </Screen>
  )
}

function RecipeEditor({ recipe, onClose, onCook }: { recipe: Recipe; onClose: () => void; onCook: (r: Recipe) => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(recipe)
  const [ingredients, setIngredients] = useState(recipe.ingredients.join('\n'))
  const [steps, setSteps] = useState((recipe.steps ?? []).join('\n'))
  const [tags, setTags] = useState(recipe.tags.join(', '))
  const [busy, setBusy] = useState(false)
  const [cooked, setCooked] = useState(false)
  const isNew = !s.recipes.some((r) => r.id === recipe.id)
  const live = s.recipes.find((r) => r.id === recipe.id)
  const cooks = [...(live?.cooks ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const last = live && lastCook(live)
  const collect = (): Recipe => ({
    ...v,
    ingredients: ingredients.split('\n').map((x) => x.trim()).filter(Boolean),
    steps: steps.split('\n').map((x) => x.trim()).filter(Boolean),
    tags: tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
  })
  const save = () => update((st) => {
    const x = collect()
    if (isNew) st.recipes.unshift(x)
    // Cooking history is written straight to the store: keep it.
    else st.recipes = st.recipes.map((r) => (r.id === x.id ? { ...x, cooks: r.cooks, cooked: r.cooked, someday: r.cooked > recipe.cooked ? false : x.someday } : r))
  })
  const doImport = async () => {
    if (!v.url) return
    setBusy(true)
    const r = await importRecipe(v.url)
    setBusy(false)
    if (!r) { toast(t('importFail')); return }
    setV({ ...v, title: v.title || r.title || '', image: r.image ?? v.image, minutes: r.minutes ?? v.minutes, servings: r.servings ?? v.servings })
    if (r.ingredients?.length) setIngredients(r.ingredients.join('\n'))
    if (r.steps?.length) setSteps(r.steps.join('\n'))
    haptic()
  }
  const toGroceries = () => {
    update((st) => {
      for (const title of collect().ingredients) {
        if (st.groceries.some((g) => !g.done && g.title.toLowerCase() === title.toLowerCase())) continue
        st.groceries.unshift({ ...base(st.me), title, category: guessCategory(title), done: false })
      }
    })
    toast(t('addedToGroceries'))
  }
  const hasSteps = steps.trim().length > 0
  return (
    <Sheet title={isNew ? t('add') : v.title} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      {(v.url || v.image) && <CoverPicker id={v.id} url={v.url} cover={v.image} title={v.title} emoji="🍳" tall
        onChange={(p) => setV((x) => ({ ...x, ...('cover' in p ? { image: p.cover } : {}), ...(p.title ? { title: p.title } : {}) }))} />}
      <Section>
        <TextRow value={v.url ?? ''} onChange={(url) => setV({ ...v, url: url || undefined, ...('cover' in relink({ url: v.url, cover: v.image }, url) ? { image: undefined } : {}) })} placeholder={`🔗 ${t('link')}`} autoFocus={isNew} />
        {v.url && /^https?:\/\//.test(v.url) && (
          <button className="row tap accent" onClick={doImport} disabled={busy}>{busy ? '…' : `✨ ${t('importRecipe')}`}</button>
        )}
      </Section>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={v.url ? t('caption') : t('title')} />
        <TextRow value={tags} onChange={setTags} placeholder={`# ${t('tags')}`} />
        <div className="row"><span className="label">⏱️ {t('minutesN', { n: '' }).trim()}</span>
          <input className="pill-input" inputMode="numeric" value={v.minutes ?? ''} style={{ maxWidth: 90 }}
            onChange={(e) => setV({ ...v, minutes: Number(e.target.value.replace(/\D/g, '')) || undefined })} />
        </div>
      </Section>
      {!isNew && (
        <Section>
          {hasSteps && <button className="row tap accent" onClick={() => { save(); onCook(collect()) }}>👩‍🍳 {t('cookMode')}</button>}
          <button className="row tap accent" disabled={!ingredients.trim()} onClick={toGroceries}>🛒 {t('toGroceries')}</button>
          <button className="row tap accent" onClick={() => setCooked(true)}>
            ✅ {t('rc.cooked')} {(live?.cooked ?? 0) > 0 && <span style={{ color: 'var(--label2)', marginLeft: 'auto' }}>{t('cooked', { n: live!.cooked })}</span>}
          </button>
          {v.url && <a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a>}
        </Section>
      )}
      {last?.note && <Section header={`📝 ${t('rc.lastTime')}`}><div className="row thought">{last.note}</div></Section>}
      <Section>
        <ToggleRow icon="⭐" label={t('rc.fav')} on={!!v.favorite} onChange={(favorite) => setV((x) => ({ ...x, favorite: favorite || undefined }))} />
        <ToggleRow icon="🕸️" label={t('someday')} on={v.someday} onChange={(someday) => setV({ ...v, someday })} />
      </Section>
      <div style={{ margin: '0 14px 6px' }}>
        <div className="section-header" style={{ padding: '6px 16px 8px' }}>{t('rc.meal')}</div>
        <Segmented inSheet value={v.meal ?? 'none'} onChange={(m) => setV((x) => ({ ...x, meal: m === 'none' ? undefined : (m as Recipe['meal']) }))}
          options={[{ value: 'none', label: '—' }, ...MEALS.map((m) => ({ value: m, label: MEAL_EMOJI[m] }))]} />
        <div className="section-header" style={{ padding: '12px 16px 8px' }}>{t('rc.diff')}</div>
        <Segmented inSheet value={String(v.difficulty ?? 0)} onChange={(d) => setV((x) => ({ ...x, difficulty: d === '0' ? undefined : (Number(d) as Recipe['difficulty']) }))}
          options={[{ value: '0', label: '—' }, ...[1, 2, 3].map((d) => ({ value: String(d), label: t(`rc.diff${d}` as TKey) }))]} />
      </div>
      <div style={{ height: 12 }} />
      <Section header={`${t('ingredients')}${v.servings ? ` · ${t('servingsN', { n: v.servings })}` : ''}`} footer={t('ingredientsHint')}>
        <div className="row"><textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={t('ingredients')} /></div>
      </Section>
      <Section header={t('steps')} footer={t('stepsHint')}>
        <div className="row"><textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={t('steps')} style={{ minHeight: 140 }} /></div>
      </Section>
      <Section>
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      {cooks.length > 0 && (
        <Section header={`👩‍🍳 ${t('rc.history')}`}>
          {cooks.slice(0, 6).map((c) => <Row key={c.id} icon={c.again === false ? '🙅' : c.again ? '🔁' : '🍽️'} title={`${fmtDate(c.date, s.lang)}${c.rating ? ' · ' + '⭐'.repeat(c.rating) : ''}`} sub={c.note} />)}
        </Section>
      )}
      <VisibilityFields value={v} onChange={setV} />
      {cooked && <CookedSheet id={recipe.id} onClose={() => setCooked(false)} />}
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st.recipes = st.recipes.filter((r) => r.id !== v.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}

/** Full-screen cooking: one big step at a time, ingredients to tick off, and the screen stays on. */
function CookMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const t = useT()
  const steps = recipe.steps ?? []
  const [i, setI] = useState(-1) // -1 = ingredients
  const [got, setGot] = useState<Set<number>>(new Set())
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])
  const done = i >= steps.length
  const go = (d: number) => { haptic(); setI((x) => Math.max(-1, Math.min(steps.length, x + d))) }
  return createPortal(
    <div className="cook">
      <div className="cook-top">
        <button className="glass-btn lg on-accent" onClick={onClose}><Icon name="close" /></button>
        <div className="cook-title">{recipe.title}</div>
        <div style={{ width: 40 }} />
      </div>
      <div className="cook-progress"><i style={{ width: `${((i + 1) / (steps.length + 1)) * 100}%` }} /></div>
      <div className="cook-body" key={i}>
        {i === -1 && (
          <>
            <div className="cook-label">{t('ingredients')}{recipe.servings ? ` · ${t('servingsN', { n: recipe.servings })}` : ''}</div>
            {recipe.ingredients.map((x, k) => (
              <div key={k} className="cook-ing" onClick={() => setGot((g) => { const n = new Set(g); if (n.has(k)) n.delete(k); else n.add(k); return n })}>
                <Check on={got.has(k)} onChange={() => {}} color="var(--green)" /><span className={got.has(k) ? 'dim' : ''}>{x}</span>
              </div>
            ))}
          </>
        )}
        {i >= 0 && !done && (
          <>
            <div className="cook-label">{t('stepN', { n: i + 1, m: steps.length })}</div>
            <div className="cook-step">{steps[i]}</div>
          </>
        )}
        {done && <div className="cook-step" style={{ textAlign: 'center' }}>{t('bonAppetit')}</div>}
      </div>
      <div className="cook-nav">
        <button className="glass-btn lg on-accent" onClick={() => go(-1)} disabled={i === -1}>← {t('prev')}</button>
        {done
          ? <button className="glass-btn lg tint" onClick={() => { update((st) => { const r = st.recipes.find((x) => x.id === recipe.id); if (r) { r.cooked += 1; r.someday = false; r.cooks = [...(r.cooks ?? []), { id: base(st.me).id, date: today(), by: st.me }] } }); onClose() }}>✅ {t('markCooked')}</button>
          : <button className="glass-btn lg tint" onClick={() => go(1)}>{t('next')} →</button>}
      </div>
    </div>,
    document.body,
  )
}

/** «We cooked it!»: stars, what to change next time, cook it again? */
function CookedSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [c, setC] = useState<Cook>({ id: base(s.me).id, date: today(), by: s.me })
  const save = () => {
    update((st) => {
      const r = st.recipes.find((x) => x.id === id)
      if (!r) return
      r.cooks = [...(r.cooks ?? []), { ...c, note: c.note?.trim() || undefined }]
      r.cooked += 1
      r.someday = false
    })
    toast(t('rc.saved'))
  }
  return (
    <Sheet title={`✅ ${t('rc.cooked')}`} onClose={onClose} onDone={save}>
      <Section><DateRow label={`📅 ${t('date')}`} value={c.date} onChange={(date) => setC((x) => ({ ...x, date: date ?? today() }))} clearable={false} /></Section>
      <Section header={t('rc.cookedTitle')}>
        <div className="row" style={{ justifyContent: 'center' }}><Stars value={c.rating} onChange={(rating) => setC((x) => ({ ...x, rating: rating || undefined }))} /></div>
      </Section>
      <Section header={t('rc.nextTime')}>
        <TextRow value={c.note ?? ''} onChange={(note) => setC((x) => ({ ...x, note }))} placeholder={t('rc.nextTimePlaceholder')} multiline />
      </Section>
      <div style={{ margin: '0 14px 16px' }}>
        <div className="section-header" style={{ padding: '6px 16px 8px' }}>{t('rc.again')}</div>
        <Segmented inSheet value={c.again === undefined ? 'maybe' : c.again ? 'yes' : 'no'} onChange={(a) => setC((x) => ({ ...x, again: a === 'maybe' ? undefined : a === 'yes' }))}
          options={[{ value: 'yes', label: `🔁 ${t('rc.againYes')}` }, { value: 'maybe', label: '🤔' }, { value: 'no', label: `🙅 ${t('rc.againNo')}` }]} />
      </div>
    </Sheet>
  )
}

/** «What shall we cook?»: a random recipe by meal, time and favourites. */
function RouletteSheet({ recipes, onOpen, onClose }: { recipes: Recipe[]; onOpen: (r: Recipe) => void; onClose: () => void }) {
  const t = useT()
  const [meal, setMeal] = useState<string | null>(null)
  const [max, setMax] = useState(0)
  const [fav, setFav] = useState(false)
  const [shown, setShown] = useState<Recipe | null>(null)
  const [spinning, setSpinning] = useState(false)
  const pool = recipes.filter((r) => !r.someday && (!meal || r.meal === meal) && (!max || (r.minutes ?? 999) <= max) && (!fav || r.favorite)
    && lastCook(r)?.again !== false)
  const spin = () => {
    if (!pool.length) return
    setSpinning(true)
    let k = 0
    const tick = () => {
      setShown(pool[Math.floor(Math.random() * pool.length)])
      haptic()
      if (++k < 14) setTimeout(tick, 70 + k * 8)
      else setSpinning(false)
    }
    tick()
  }
  return (
    <Sheet title={`🎲 ${t('rc.roulette')}`} onClose={onClose}>
      <div className={'pl-wheel rc-wheel' + (spinning ? ' spinning' : '')}>
        <div className="pl-wheel-emoji">{spinning ? '🎲' : shown ? (shown.meal ? MEAL_EMOJI[shown.meal] : '🍳') : '🍳'}</div>
        <b>{shown ? shown.title : t('rc.rouletteHint')}</b>
        {shown && !spinning && <span>{[shown.minutes && t('minutesN', { n: shown.minutes }), shown.difficulty && t(`rc.diff${shown.difficulty}` as TKey), shown.favorite && '⭐'].filter(Boolean).join(' · ')}</span>}
      </div>
      <div className="chips pl-filters" style={{ margin: '0 16px 10px' }}>
        {MEALS.map((m) => <button key={m} className={'chip' + (meal === m ? ' on' : '')} onClick={() => setMeal(meal === m ? null : m)}>{MEAL_EMOJI[m]} {t(`rc.meal.${m}` as TKey)}</button>)}
      </div>
      <div className="chips pl-filters" style={{ margin: '0 16px 10px' }}>
        {[0, 15, 30, 60].map((m) => <button key={m} className={'chip' + (max === m ? ' on' : '')} onClick={() => setMax(m)}>⏱️ {m ? `≤ ${m}` : t('rc.any')}</button>)}
      </div>
      <Section footer={t('rc.poolN', { n: pool.length })}><ToggleRow icon="⭐" label={t('rc.onlyFav')} on={fav} onChange={setFav} /></Section>
      <Section>
        <button className="row tap accent" disabled={!pool.length || spinning} style={!pool.length ? { opacity: 0.4 } : undefined} onClick={spin}>🎲 {shown ? t('rc.spinAgain') : t('rc.spin')}</button>
        {shown && !spinning && <button className="row tap accent" onClick={() => onOpen(shown)}>🍳 {t('rc.open')}</button>}
      </Section>
    </Sheet>
  )
}
