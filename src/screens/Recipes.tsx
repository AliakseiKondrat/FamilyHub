import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Check, Empty, GlassButton, Icon, Marks, Screen, Section, Sheet, TextRow, ToggleRow, VisibilityFields, haptic, toast } from '../ui'
import { guessCategory } from '../lib/categories'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/widget'
import type { Recipe } from '../types'
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
  const all = visible(s.recipes, s.me)
  const tags = [...new Set(all.flatMap((r) => r.tags))].sort()
  const list = all.filter((r) => (tag === '__someday' ? r.someday : !tag || r.tags.includes(tag)))
  const regular = list.filter((r) => !r.someday || tag === '__someday')
  const someday = tag === '__someday' ? [] : list.filter((r) => r.someday)

  const card = (r: Recipe) => (
    <button key={r.id} className="recipe-card" onClick={() => setEdit(r)}>
      <CoverBox className="rc-img" src={r.image} fallback={<span>{r.someday ? '🕸️' : '🍳'}</span>}>
        {r.cooked > 0 && <span className="rc-badge">👩‍🍳 {r.cooked}</span>}
      </CoverBox>
      <div className="rc-title">{r.title} <Marks x={r} /></div>
      <div className="rc-sub">{[r.minutes && t('minutesN', { n: r.minutes }), ...r.tags.slice(0, 2).map((x) => '#' + x)].filter(Boolean).join(' · ')}</div>
    </button>
  )

  return (
    <Screen title={moduleLabel(s, 'recipes').title} back={back} accent="recipes"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), title: '', tags: [], ingredients: [], someday: false, cooked: 0 })} />}
      head={<div className="chips" style={{ paddingTop: 0 }}>
        <button className={'chip' + (!tag ? ' on' : '')} onClick={() => setTag(null)}>{t('all')}</button>
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
  const isNew = !s.recipes.some((r) => r.id === recipe.id)
  const collect = (): Recipe => ({
    ...v,
    ingredients: ingredients.split('\n').map((x) => x.trim()).filter(Boolean),
    steps: steps.split('\n').map((x) => x.trim()).filter(Boolean),
    tags: tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
  })
  const save = () => update((st) => {
    const x = collect()
    if (isNew) st.recipes.unshift(x)
    else st.recipes = st.recipes.map((r) => (r.id === x.id ? x : r))
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
          <button className="row tap accent" onClick={() => setV({ ...v, cooked: v.cooked + 1, someday: false })}>
            ✅ {t('markCooked')} {v.cooked > 0 && <span style={{ color: 'var(--label2)', marginLeft: 'auto' }}>{t('cooked', { n: v.cooked })}</span>}
          </button>
          {v.url && <a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a>}
        </Section>
      )}
      <Section><ToggleRow icon="🕸️" label={t('someday')} on={v.someday} onChange={(someday) => setV({ ...v, someday })} /></Section>
      <Section header={`${t('ingredients')}${v.servings ? ` · ${t('servingsN', { n: v.servings })}` : ''}`} footer={t('ingredientsHint')}>
        <div className="row"><textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={t('ingredients')} /></div>
      </Section>
      <Section header={t('steps')} footer={t('stepsHint')}>
        <div className="row"><textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={t('steps')} style={{ minHeight: 140 }} /></div>
      </Section>
      <Section>
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      <VisibilityFields value={v} onChange={setV} />
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
          ? <button className="glass-btn lg tint" onClick={() => { update((st) => { const r = st.recipes.find((x) => x.id === recipe.id); if (r) { r.cooked += 1; r.someday = false } }); onClose() }}>✅ {t('markCooked')}</button>
          : <button className="glass-btn lg tint" onClick={() => go(1)}>{t('next')} →</button>}
      </div>
    </div>,
    document.body,
  )
}
