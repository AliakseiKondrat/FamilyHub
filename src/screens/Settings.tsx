import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { disablePush, enablePush, pushStatus, pushSupport, testPush } from '../lib/push'
import { API_BASE, widgetScript } from '../lib/widget'
import { PRESETS as SHORTCUTS, presetSteps } from '../lib/shortcuts'
import { getState, replaceState, uid, update, useApp } from '../store'
import { DEFAULT_EMOJI, LANG_NAMES, moduleLabel, useT, type TKey } from '../i18n'
import { Row, Screen, Section, Segmented, SelectRow, Sheet, Switch, TextRow, ToggleRow, emojiList, toast } from '../ui'
import { demoState } from '../demo'
import { SUPABASE_URL, SYNC_ENABLED } from '../config'
import { LOCALES } from '../lib/date'
import { signOut, useSync } from '../sync'
import { useNav, type SettingsPage } from '../nav'
import { ALL_MODULES, defaultDesign } from '../defaults'
import { accentColors, DEFAULT_ACCENT, PRESETS, type Accent } from '../theme'
import { catTitle } from '../lib/cats'
import type { Category, Design, Lang, ModuleId, State, StatusPreset, Theme, TodayBlock, UserId } from '../types'

const setDesign = (patch: Partial<Design>) => update((st) => { st.design = { ...st.design, ...patch } })
const setPrefs = (patch: Partial<State['prefs']>) => update((st) => { st.prefs = { ...st.prefs, ...patch } })

function move<T>(list: T[], i: number, d: number) {
  const next = [...list]
  const j = i + d
  if (j < 0 || j >= next.length) return next
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

function Order({ i, n, onMove }: { i: number; n: number; onMove: (d: number) => void }) {
  return (
    <div className="order-btns" onClick={(e) => e.stopPropagation()}>
      <button disabled={i === 0} onClick={() => onMove(-1)} aria-label="Up">▲</button>
      <button disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Down">▼</button>
    </div>
  )
}

/** One settings segmented control with a title above it. */
function Choice<T extends string>({ label, value, options, onChange }: { label: ReactNode; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ margin: '0 14px 6px' }}>
      <div className="section-header" style={{ padding: '6px 16px 8px' }}>{label}</div>
      <Segmented inSheet value={value} onChange={onChange} options={options} />
    </div>
  )
}

export default function Settings({ page = 'root' }: { page?: SettingsPage }) {
  switch (page) {
    case 'design': return <DesignPage />
    case 'tabs': return <TabsPage />
    case 'today': return <TodayPage />
    case 'sections': return <SectionsPage />
    case 'groceryCats': return <CategoriesPage kind="grocery" />
    case 'budget': return <BudgetPage />
    case 'people': return <PeoplePage />
    case 'region': return <RegionPage />
    case 'data': return <DataPage />
    case 'notifications': return <NotificationsPage />
    case 'siri': return <SiriPage />
    case 'widget': return <WidgetPage />
    case 'google': return <GooglePage />
    case 'statuses': return <StatusesPage />
    case 'shortcuts': return <ShortcutsPage />
    default: return <RootPage />
  }
}

function RootPage() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const sync = useSync()
  const link = (icon: string, bg: string, title: ReactNode, page: SettingsPage, detail?: ReactNode) => (
    <Row icon={icon} iconBg={bg} title={title} detail={detail} chevron onClick={() => nav.settings(page)} />
  )
  return (
    <Screen title={t('settings')} back accent="settings"
      hero={<div className="settings-hero">
        <span className="circle lg">{s.users[s.me].emoji}</span>
        <div>
          <div className="hero-num">{s.users[s.me].name}</div>
          <div className="hero-sub" style={{ marginTop: 0 }}>{SYNC_ENABLED ? sync.email : t('prototype').split(':')[0]}</div>
        </div>
      </div>}>
      {SYNC_ENABLED ? (
        <Section footer={t('installHint')}>
          <Row icon={!sync.online ? '📴' : sync.pending ? '⏳' : '☁️'}
            title={!sync.online ? t('offline') : sync.pending ? t('pendingN', { n: sync.pending }) : t('synced')} />
          <button className="row tap destructive" onClick={() => signOut()}>{t('signOut')}</button>
        </Section>
      ) : (
        <>
          <Choice label={t('iAm')} value={s.me} onChange={(me) => update((st) => { st.me = me })}
            options={(['a', 'j'] as UserId[]).map((u) => ({ value: u, label: `${s.users[u].emoji} ${s.users[u].name}` }))} />
          <div className="section-footer" style={{ margin: '-10px 14px 18px' }}>{t('iAmHint')}</div>
        </>
      )}

      <Section header={t('design')}>
        {link('🎨', 'linear-gradient(135deg,#ff2d55,#af52de,#0a84ff)', t('design'), 'design', t(`theme.${s.theme}`))}
        {link('🧭', 'color-mix(in srgb, var(--blue) 20%, transparent)', t('tabBar'), 'tabs', s.prefs.tabs.map((m) => moduleLabel(s, m).emoji).join(''))}
        {link('☀️', 'color-mix(in srgb, var(--orange) 20%, transparent)', t('todayScreen'), 'today')}
        {link('💬', 'color-mix(in srgb, var(--green) 20%, transparent)', t('statuses'), 'statuses', s.prefs.showStatuses ? t('on') : t('off'))}
      </Section>

      <Section header={t('lists')}>
        {link('🗂️', 'var(--fill)', t('sections'), 'sections')}
        {link('🛒', 'color-mix(in srgb, var(--green) 20%, transparent)', t('groceryCats'), 'groceryCats', s.groceryCats.filter((c) => !c.hidden).length)}
        {link('💰', 'color-mix(in srgb, var(--teal) 20%, transparent)', t('budgetSettings'), 'budget', `${s.splitA}/${100 - s.splitA}`)}
      </Section>
      <Section footer={t('linkPreviewsHint')}>
        <ToggleRow icon="🖼️" label={t('linkPreviews')} on={s.prefs.linkPreviews} onChange={(linkPreviews) => setPrefs({ linkPreviews })} />
      </Section>

      <Section header={t('general')}>
        {link('👥', 'color-mix(in srgb, var(--pink) 20%, transparent)', t('people'), 'people', `${s.users.a.emoji}${s.users.j.emoji}`)}
        <Row icon={s.pet.emoji} iconBg="color-mix(in srgb, var(--brown) 20%, transparent)" title={t('pet')} detail={s.pet.name} chevron onClick={() => nav.open('pet')} />
        {link('🌐', 'color-mix(in srgb, var(--indigo) 20%, transparent)', t('regionLang'), 'region', LANG_NAMES[s.lang])}
      </Section>

      <Section header={t('integrations')}>
        {link('🔔', 'color-mix(in srgb, var(--red) 20%, transparent)', t('push'), 'notifications')}
        {link('⚡️', 'linear-gradient(135deg,#ff2d55,#5856d6)', t('presets'), 'shortcuts', SHORTCUTS.length)}
        {link('🎙️', 'color-mix(in srgb, var(--purple) 20%, transparent)', t('siriTitle'), 'siri')}
        {link('🧩', 'color-mix(in srgb, var(--orange) 20%, transparent)', t('widgets'), 'widget')}
        {link('G', 'color-mix(in srgb, #4285f4 18%, transparent)', t('connectGoogle'), 'google')}
      </Section>

      <Section>
        {link('💾', 'var(--fill)', t('data'), 'data')}
      </Section>
      <div className="section-footer" style={{ textAlign: 'center', paddingBottom: 20 }}>Family Hub · v0.3</div>
    </Screen>
  )
}

/* ---------- Appearance ---------- */
function DesignPage() {
  const s = useApp()
  const t = useT()
  const d = s.design
  const [colorFor, setColorFor] = useState<Accent | null>(null)
  const accents: Accent[] = [...ALL_MODULES, 'more', 'settings']
  return (
    <Screen title={t('design')} back accent="settings" subtitle={t('designHint')}>
      <Choice label={t('theme')} value={s.theme} onChange={(theme) => update((st) => { st.theme = theme })}
        options={(['auto', 'light', 'dark'] as Theme[]).map((x) => ({ value: x, label: t(`theme.${x}`) }))} />
      <Choice label={`🖥️ ${t('layout')}`} value={s.prefs.layout} onChange={(layout) => setPrefs({ layout })}
        options={(['auto', 'phone', 'wide'] as const).map((x) => ({ value: x, label: t(`layout.${x}`) }))} />
      <div className="section-footer" style={{ margin: '-8px 14px 4px' }}>{t('layoutHint')}</div>
      <Choice label={t('glass')} value={d.glass} onChange={(glass) => setDesign({ glass })}
        options={(['strong', 'normal', 'off'] as const).map((x) => ({ value: x, label: t(`glass.${x}`) }))} />
      <Choice label={t('headerStyle')} value={d.header} onChange={(header) => setDesign({ header })}
        options={(['gradient', 'mesh', 'solid'] as const).map((x) => ({ value: x, label: t(`header.${x}`) }))} />
      <Choice label={t('cardsStyle')} value={d.cards} onChange={(cards) => setDesign({ cards })}
        options={(['shadow', 'flat'] as const).map((x) => ({ value: x, label: t(`cards.${x}`) }))} />
      <Choice label={t('radius')} value={d.radius} onChange={(radius) => setDesign({ radius })}
        options={(['compact', 'normal', 'round'] as const).map((x) => ({ value: x, label: t(`radius.${x}`) }))} />
      <Choice label={t('textSize')} value={d.textSize} onChange={(textSize) => setDesign({ textSize })}
        options={(['s', 'm', 'l'] as const).map((x) => ({ value: x, label: t(`text.${x}`) }))} />
      <Choice label={t('tabTint')} value={d.tabTint} onChange={(tabTint) => setDesign({ tabTint })}
        options={(['blue', 'accent', 'mono'] as const).map((x) => ({ value: x, label: t(`tint.${x}`) }))} />
      <div style={{ height: 14 }} />
      <Section>
        <ToggleRow icon="🏷️" label={t('tabLabels')} on={d.tabLabels} onChange={(tabLabels) => setDesign({ tabLabels })} />
        <ToggleRow icon="🐢" label={t('reduceMotion')} on={d.reduceMotion} onChange={(reduceMotion) => setDesign({ reduceMotion })} />
        <ToggleRow icon="📳" label={t('haptics')} on={d.haptics} onChange={(haptics) => setDesign({ haptics })} />
      </Section>
      <Section big header={t('sectionColors')}>
        {accents.filter((a) => a !== 'cycle' || s.me === 'j').map((a) => {
          const [c1, c2] = accentColors(a, s)
          const label = a === 'more' ? t('more') : a === 'settings' ? t('settings') : moduleLabel(s, a as ModuleId).title
          return <Row key={a} title={label} onClick={() => setColorFor(a)} chevron
            right={<span className="swatch" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />} />
        })}
      </Section>
      <Section>
        <button className="row tap destructive" onClick={() => update((st) => { st.design = defaultDesign() })}>{t('reset2')}</button>
      </Section>
      {colorFor && <ColorSheet accent={colorFor} onClose={() => setColorFor(null)} />}
    </Screen>
  )
}

function ColorSheet({ accent, onClose }: { accent: Accent; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const current = s.design.accents[accent] ?? DEFAULT_ACCENT[accent]
  const pick = (id: string) => update((st) => { st.design = { ...st.design, accents: { ...st.design.accents, [accent]: id === DEFAULT_ACCENT[accent] ? undefined : id } } })
  const [c1, c2] = PRESETS[current]
  return (
    <Sheet title={t('color')} onClose={onClose}>
      <div style={{ margin: '0 14px 16px', height: 110, borderRadius: 'var(--radius)', background: `radial-gradient(80% 60% at 90% -5%, rgba(255,255,255,.32), transparent 60%), linear-gradient(160deg, ${c1}, ${c2})`, color: '#fff', display: 'flex', alignItems: 'flex-end', padding: 16, fontSize: 26, fontWeight: 800 }}>
        {accent === 'more' ? t('more') : accent === 'settings' ? t('settings') : moduleLabel(s, accent as ModuleId).title}
      </div>
      <div className="list" style={{ margin: '0 14px' }}>
        <div className="preset-grid">
          {Object.entries(PRESETS).map(([id, [a, b]]) => (
            <button key={id} className={'preset' + (id === current ? ' on' : '')} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => pick(id)} aria-label={id} />
          ))}
        </div>
      </div>
    </Sheet>
  )
}

/* ---------- Tab bar ---------- */
function TabsPage() {
  const s = useApp()
  const t = useT()
  const tabs = s.prefs.tabs
  const available = ALL_MODULES.filter((m) => !tabs.includes(m) && (m !== 'cycle' || s.me === 'j'))
  return (
    <Screen title={t('tabBar')} back accent="settings" subtitle={t('chosen', { n: tabs.length, max: 4 })}>
      <Section footer={t('tabBarHint')}>
        {tabs.map((m, i) => {
          const l = moduleLabel(s, m)
          return (
            <Row key={m} icon={l.emoji} title={l.title}
              right={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Order i={i} n={tabs.length} onMove={(d) => setPrefs({ tabs: move(tabs, i, d) })} />
                <button className="order-btns" style={{ border: 0, background: 'none', padding: 0 }} disabled={tabs.length <= 1}
                  onClick={() => setPrefs({ tabs: tabs.filter((x) => x !== m) })}><span style={{ width: 32, height: 32, borderRadius: 10, background: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)', display: 'grid', placeItems: 'center' }}>−</span></button>
              </div>} />
          )
        })}
        <Row icon="⋯" title={t('more')} dim />
      </Section>
      {tabs.length < 4 && (
        <Section header={t('add')}>
          {available.map((m) => {
            const l = moduleLabel(s, m)
            return <Row key={m} icon={l.emoji} title={l.title} onClick={() => setPrefs({ tabs: [...tabs, m] })}
              right={<span style={{ width: 32, height: 32, borderRadius: 10, background: 'color-mix(in srgb, var(--green) 15%, transparent)', color: 'var(--green)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>+</span>} />
          })}
        </Section>
      )}
      <Section>
        <ToggleRow icon="👆" label={t('swipeTabs')} on={s.prefs.swipeTabs} onChange={(swipeTabs) => setPrefs({ swipeTabs })} />
        <SelectRow label={`🚀 ${t('startTab')}`} value={s.prefs.startTab} onChange={(startTab) => setPrefs({ startTab })}
          options={tabs.map((m) => ({ value: m, label: moduleLabel(s, m).title }))} />
      </Section>
    </Screen>
  )
}

/* ---------- Today ---------- */
const BLOCK_LABEL: Record<TodayBlock, { emoji: string; key: TKey }> = {
  events: { emoji: '📅', key: 'todayEvents' }, tasks: { emoji: '✅', key: 'todayTasks' }, trip: { emoji: '✈️', key: 'mod.travel' },
  budget: { emoji: '💰', key: 'mod.budget' }, pet: { emoji: '🐶', key: 'mod.pet' }, music: { emoji: '🎧', key: 'mod.music' },
  memories: { emoji: '📸', key: 'onThisDay' }, dateIdea: { emoji: '💕', key: 'dateIdea' }, tomorrow: { emoji: '📆', key: 'tomorrow' },
}

function TodayPage() {
  const s = useApp()
  const t = useT()
  const blocks = s.prefs.todayBlocks
  const actions = s.prefs.todayActions
  const candidates = ALL_MODULES.filter((m) => m !== 'today' && !s.prefs.tabs.includes(m) && (m !== 'cycle' || s.me === 'j'))
  return (
    <Screen title={t('todayScreen')} back accent="today">
      <Section header={t('shortcuts')} footer={t('shortcutsHint')}>
        {candidates.map((m) => {
          const l = moduleLabel(s, m)
          const on = actions.includes(m)
          return (
            <Row key={m} icon={l.emoji} title={l.title}
              right={<Switch on={on} onChange={(v) => setPrefs({ todayActions: v ? [...actions.filter((x) => candidates.includes(x)), m].slice(-4) : actions.filter((x) => x !== m) })} />} />
          )
        })}
      </Section>
      <Section header={t('blocks')}>
        {blocks.map((b, i) => (
          <Row key={b.id} icon={BLOCK_LABEL[b.id].emoji} title={t(BLOCK_LABEL[b.id].key)} dim={!b.on}
            right={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Order i={i} n={blocks.length} onMove={(d) => setPrefs({ todayBlocks: move(blocks, i, d) })} />
              <Switch on={b.on} onChange={(on) => setPrefs({ todayBlocks: blocks.map((x) => (x.id === b.id ? { ...x, on } : x)) })} />
            </div>} />
        ))}
      </Section>
    </Screen>
  )
}

/* ---------- Sections ---------- */
function SectionsPage() {
  const s = useApp()
  const t = useT()
  const [mod, setMod] = useState<ModuleId | null>(null)
  return (
    <Screen title={t('sections')} back accent="settings" subtitle={t('sectionsHint')}>
      <Section>
        {ALL_MODULES.filter((m) => m !== 'cycle' || s.me === 'j').map((m) => {
          const l = moduleLabel(s, m)
          const [c1, c2] = accentColors(m, s)
          return <Row key={m} icon={l.emoji} iconBg={`linear-gradient(135deg, ${c1}, ${c2})`} title={l.title} dim={s.modules[m]?.hidden}
            detail={s.modules[m]?.hidden ? t('hidden') : undefined} chevron onClick={() => setMod(m)} />
        })}
      </Section>
      {mod && <ModuleSheet id={mod} onClose={() => setMod(null)} />}
    </Screen>
  )
}

function EmojiPicker({ value, onChange, extra = [] }: { value: string; onChange: (e: string) => void; extra?: string[] }) {
  return (
    <>
      <div className="emoji-grid">
        {[...new Set([...extra, ...emojiList()])].map((e) => <button key={e} className={e === value ? 'on' : ''} onClick={() => onChange(e)}>{e}</button>)}
      </div>
      <TextRow value={value} onChange={(v) => onChange([...new Intl.Segmenter().segment(v)].pop()?.segment ?? '')} placeholder="🙂" />
    </>
  )
}

function ModuleSheet({ id, onClose }: { id: ModuleId; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [title, setTitle] = useState(s.modules[id]?.title ?? '')
  const [emoji, setEmoji] = useState(moduleLabel(s, id).emoji)
  const [hidden, setHidden] = useState(!!s.modules[id]?.hidden)
  const [accent, setAccent] = useState(s.design.accents[id] ?? DEFAULT_ACCENT[id])
  const def = t(`mod.${id}` as TKey)
  return (
    <Sheet title={`${emoji} ${title || def}`} onClose={onClose}
      onDone={() => update((st) => {
        st.modules[id] = { title: title.trim() || undefined, emoji: emoji === DEFAULT_EMOJI[id] ? undefined : emoji, hidden: hidden || undefined }
        st.design = { ...st.design, accents: { ...st.design.accents, [id]: accent === DEFAULT_ACCENT[id] ? undefined : accent } }
      })}>
      <Section footer={`${t('defaultName')}: ${def}`}>
        <TextRow value={title} onChange={setTitle} placeholder={def} />
      </Section>
      {!s.prefs.tabs.includes(id) && <Section><ToggleRow icon="👁️" label={t('showInMore')} on={!hidden} onChange={(v) => setHidden(!v)} /></Section>}
      <Section header={t('color')}>
        <div className="preset-grid">
          {Object.entries(PRESETS).map(([pid, [a, b]]) => (
            <button key={pid} className={'preset' + (pid === accent ? ' on' : '')} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => setAccent(pid)} aria-label={pid} />
          ))}
        </div>
      </Section>
      <Section header={t('emoji')}><EmojiPicker value={emoji} onChange={setEmoji} /></Section>
      <Section>
        <button className="row tap destructive" onClick={() => {
          update((st) => { delete st.modules[id]; st.design = { ...st.design, accents: { ...st.design.accents, [id]: undefined } } })
          onClose()
        }}>{t('reset2')}</button>
      </Section>
    </Sheet>
  )
}

/* ---------- Categories (groceries / budget) ---------- */
function CategoriesPage({ kind }: { kind: 'grocery' | 'budget' }) {
  const t = useT()
  return (
    <Screen title={kind === 'grocery' ? t('groceryCats') : t('budgetCats')} back accent={kind === 'grocery' ? 'groceries' : 'budget'}>
      <CategoryList kind={kind} />
    </Screen>
  )
}

function CategoryList({ kind }: { kind: 'grocery' | 'budget' }) {
  const s = useApp()
  const t = useT()
  const [edit, setEdit] = useState<Category | null>(null)
  const key = kind === 'grocery' ? 'groceryCats' : 'budgetCats'
  const list = s[key]
  const save = (next: Category[]) => update((st) => { st[key] = next })
  return (
    <>
      <Section>
        {list.map((c, i) => (
          <Row key={c.id} icon={c.emoji} title={catTitle(s, kind, c.id)} dim={c.hidden} onClick={() => setEdit(c)}
            right={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Order i={i} n={list.length} onMove={(d) => save(move(list, i, d))} />
              <Switch on={!c.hidden} onChange={(on) => save(list.map((x) => (x.id === c.id ? { ...x, hidden: !on || undefined } : x)))} />
            </div>} />
        ))}
        <button className="row tap accent" onClick={() => setEdit({ id: 'c-' + uid().slice(0, 8), emoji: '🏷️', custom: true, title: '' })}>＋ {t('newCategory')}</button>
      </Section>
      {edit && <CategorySheet kind={kind} cat={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function CategorySheet({ kind, cat, onClose }: { kind: 'grocery' | 'budget'; cat: Category; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const key = kind === 'grocery' ? 'groceryCats' : 'budgetCats'
  const isNew = !s[key].some((c) => c.id === cat.id)
  const [v, setV] = useState(cat)
  const def = isNew ? '' : catTitle({ ...s, [key]: s[key].map((c) => (c.id === cat.id ? { ...c, title: undefined } : c)) }, kind, cat.id)
  return (
    <Sheet title={`${v.emoji} ${v.title || def}`} onClose={onClose} doneDisabled={isNew && !v.title?.trim()}
      onDone={() => update((st) => {
        const x = { ...v, title: v.title?.trim() || undefined }
        st[key] = isNew ? [...st[key], x] : st[key].map((c) => (c.id === x.id ? x : c))
      })}>
      <Section footer={def ? `${t('defaultName')}: ${def}` : undefined}>
        <TextRow value={v.title ?? ''} onChange={(title) => setV({ ...v, title })} placeholder={def || t('title')} autoFocus={isNew} />
      </Section>
      <Section header={t('emoji')}>
        <EmojiPicker value={v.emoji} onChange={(emoji) => setV({ ...v, emoji })}
          extra={kind === 'grocery' ? ['🥦', '🍎', '🧀', '🥩', '🐟', '🍞', '🧊', '🥤', '🍷', '🥫', '🍝', '🧂', '🧻', '🧴', '🐾', '👶', '💊', '🌿'] : ['🛒', '🍽️', '🏠', '🚗', '🎉', '🐶', '💊', '✈️', '🎁', '📺', '💼', '👗', '📚', '🏋️', '💄', '🧾']} />
      </Section>
      {cat.custom && !isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => { update((st) => { st[key] = st[key].filter((c) => c.id !== cat.id) }); onClose() }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}

/* ---------- Budget ---------- */
function BudgetPage() {
  const s = useApp()
  const t = useT()
  return (
    <Screen title={t('budgetSettings')} back accent="budget">
      <Section header={t('split')} footer={t('splitHint', { a: s.users.a.name, b: s.users.j.name, pa: s.splitA, pb: 100 - s.splitA })}>
        <div className="row" style={{ gap: 14 }}>
          <span>{s.users.a.emoji}</span>
          <input type="range" min={0} max={100} step={5} value={s.splitA} style={{ accentColor: 'var(--blue)' }}
            onChange={(e) => update((st) => { st.splitA = Number(e.target.value) })} />
          <span>{s.users.j.emoji}</span>
        </div>
      </Section>
      <Section>
        <SelectRow label={`💱 ${t('currency')}`} value={s.country} onChange={(country) => update((st) => { st.country = country })}
          options={[{ value: 'PL', label: 'PLN · zł' }, { value: 'ES', label: 'EUR · €' }]} />
      </Section>
      <div className="section-header" style={{ padding: '6px 30px 8px' }}>{t('budgetCats')}</div>
      <CategoryList kind="budget" />
    </Screen>
  )
}

/* ---------- People ---------- */
function PeoplePage() {
  const s = useApp()
  const t = useT()
  const [person, setPerson] = useState<UserId | null>(null)
  return (
    <Screen title={t('people')} back accent="dates">
      <Section>
        {(['a', 'j'] as UserId[]).map((u) => (
          <Row key={u} icon={s.users[u].emoji} iconBg={`color-mix(in srgb, var(--${u}) 20%, transparent)`} title={s.users[u].name} chevron onClick={() => setPerson(u)} />
        ))}
      </Section>
      {person && <PersonSheet id={person} onClose={() => setPerson(null)} />}
    </Screen>
  )
}

function PersonSheet({ id, onClose }: { id: UserId; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(s.users[id])
  return (
    <Sheet title={v.name} onClose={onClose} onDone={() => update((st) => { st.users[id] = v })}>
      <Section><TextRow value={v.name} onChange={(name) => setV({ ...v, name })} placeholder={t('name')} /></Section>
      <Section header={t('emoji')}>
        <EmojiPicker value={v.emoji} onChange={(emoji) => setV({ ...v, emoji })}
          extra={['🧔', '👨', '🧑', '👱‍♂️', '👩', '👱‍♀️', '👩‍🦰', '🧑‍🦱', '🐻', '🦊', '🐰', '🐱', '🌸', '⭐️', '🌙', '☀️']} />
      </Section>
    </Sheet>
  )
}

/* ---------- Language & region ---------- */
function RegionPage() {
  const s = useApp()
  const t = useT()
  return (
    <Screen title={t('regionLang')} back accent="settings">
      <Section>
        <SelectRow label={`🌐 ${t('language')}`} value={s.lang} onChange={(lang) => update((st) => { st.lang = lang })}
          options={(Object.keys(LANG_NAMES) as Lang[]).map((l) => ({ value: l, label: LANG_NAMES[l] }))} />
        <SelectRow label={`📍 ${t('country')}`} value={s.country} onChange={(country) => update((st) => { st.country = country })}
          options={[{ value: 'PL', label: `🇵🇱 ${t('poland')} · PLN` }, { value: 'ES', label: `🇪🇸 ${t('spain')} · EUR` }]} />
        <SelectRow label={`📅 ${t('weekStart')}`} value={String(s.prefs.weekStart) as '0' | '1'} onChange={(v) => setPrefs({ weekStart: v === '0' ? 0 : 1 })}
          options={[{ value: '1', label: t('monday') }, { value: '0', label: t('sunday') }]} />
      </Section>
    </Screen>
  )
}

/* ---------- Notifications ---------- */
function NotificationsPage() {
  const s = useApp()
  const t = useT()
  const support = pushSupport()
  const [status, setStatus] = useState<'on' | 'off' | 'denied' | '…'>('…')
  const [busy, setBusy] = useState(false)
  const n = s.prefs.notify
  const setN = (patch: Partial<typeof n>) => setPrefs({ notify: { ...n, ...patch } })
  useEffect(() => { pushStatus().then(setStatus) }, [])
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } catch (e) { toast('⚠︎ ' + ((e as Error).message ?? '')) }
    setStatus(await pushStatus())
    setBusy(false)
  }
  return (
    <Screen title={t('push')} back accent="calendar"
      hero={<div className="hero-sub" style={{ marginTop: 0, fontSize: 17 }}>
        {support === 'needs-install' ? t('pushInstall') : support === 'unsupported' ? t('pushUnsupported')
          : status === 'on' ? `✅ ${t('pushOn')}` : status === 'denied' ? `⛔️ ${t('pushDenied')}` : `🔕 ${t('pushOff')}`}
      </div>}
      actions={support === 'ok' ? [
        status === 'on'
          ? { icon: '🔔', label: t('pushTest'), onClick: () => run(async () => { await testPush(t('pushTest'), t('pushTestSent')); toast(t('pushTestSent')) }) }
          : { icon: '🔔', label: t('pushEnable'), onClick: () => run(enablePush) },
      ] : undefined}>
      {busy && <div className="empty" style={{ padding: 12 }}>…</div>}
      <Section header={t('what')}>
        <ToggleRow icon="💞" label={t('nActivity', { name: s.users[s.me === 'a' ? 'j' : 'a'].name })} on={n.activity} onChange={(activity) => setN({ activity })} />
        <ToggleRow icon="⏰" label={t('nReminders')} on={n.reminders} onChange={(reminders) => setN({ reminders })} />
        <SelectRow label={`📅 ${t('nLead')}`} value={String(n.eventLead)} onChange={(v) => setN({ eventLead: Number(v) })}
          options={[5, 10, 15, 30, 60, 120].map((m) => ({ value: String(m), label: `${m} ${t('min')}` }))} />
        <ToggleRow icon="☀️" label={t('nMorning')} on={n.morning} onChange={(morning) => setN({ morning })} />
        {n.morning && (
          <div className="row"><span className="label">{t('nMorningTime')}</span>
            <input className="pill-input" type="time" value={n.morningTime} onChange={(e) => e.target.value && setN({ morningTime: e.target.value })} style={{ width: 'auto' }} />
          </div>
        )}
      </Section>
      {support === 'ok' && status === 'on' && (
        <Section>
          <button className="row tap destructive" onClick={() => run(disablePush)}>{t('pushDisable')}</button>
        </Section>
      )}
    </Screen>
  )
}

/* ---------- Siri & widget ---------- */
const KEY_STORE = 'familyhub:apikey'
function useApiKey() {
  const [key, setKey] = useState<string | null>(() => { try { return localStorage.getItem(KEY_STORE) } catch { return null } })
  const [exists, setExists] = useState<boolean | null>(null)
  useEffect(() => { supabase?.rpc('has_api_token').then(({ data }) => setExists(!!data)) }, [])
  const create = async () => {
    const { data, error } = await supabase!.rpc('create_api_token')
    if (error) { toast('⚠︎ ' + error.message); return }
    try { localStorage.setItem(KEY_STORE, data as string) } catch { /* ignore */ }
    setKey(data as string)
    setExists(true)
  }
  return { key: exists === false ? null : key, exists, create }
}

function CopyRow({ label, value }: { label: ReactNode; value: string }) {
  const t = useT()
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="row-main">
        <div className="row-sub" style={{ marginTop: 0 }}>{label}</div>
        <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, wordBreak: 'break-all', marginTop: 4, userSelect: 'text' }}>{value}</div>
      </div>
      <button className="chip" style={{ background: 'var(--fill)', boxShadow: 'none', marginTop: 10 }}
        onClick={() => navigator.clipboard.writeText(value).then(() => toast(t('copied')))}>{t('copy')}</button>
    </div>
  )
}

function KeySection({ api }: { api: ReturnType<typeof useApiKey> }) {
  const t = useT()
  const { key, exists, create } = api
  if (!SYNC_ENABLED) return <Section><Row title={t('prototype')} /></Section>
  return (
    <Section header={t('apiKey')} footer={key ? t('apiKeyShown') : undefined}>
      {key && <CopyRow label="key" value={key} />}
      <button className="row tap accent" onClick={create}>🔑 {exists ? t('apiKeyNew') : t('apiKeyCreate')}</button>
    </Section>
  )
}

function SiriPage() {
  const t = useT()
  const api = useApiKey()
  const { key } = api
  return (
    <Screen title={t('siriTitle')} back accent="watch" subtitle={t('siriIntro')}>
      <KeySection api={api} />
      <Section>
        {(['siri1', 'siri2', 'siri3', 'siri4', 'siri5', 'siri6'] as const).map((k, i) => (
          <Row key={k} icon={<b>{i + 1}</b>} title={<span style={{ fontWeight: 400 }}>{t(k)}</span>} />
        ))}
      </Section>
      <Section>
        <CopyRow label={t('apiUrl')} value={`${API_BASE}/add`} />
        <CopyRow label="JSON" value={`{ "key": "${key ?? '…'}", "list": "groceries", "text": "…" }`} />
      </Section>
      <Section footer={t('siriRead')}>
        <CopyRow label={t('listUrl')} value={key ? `${API_BASE}/list?name=groceries&key=${key}` : t('needKey')} />
      </Section>
    </Screen>
  )
}

function WidgetPage() {
  const t = useT()
  const api = useApiKey()
  const { key } = api
  return (
    <Screen title={t('widgetTitle')} back accent="recipes" subtitle={t('widgetIntro')}>
      <KeySection api={api} />
      <Section>
        {(['w1', 'w2', 'w3', 'w4'] as const).map((k, i) => <Row key={k} icon={<b>{i + 1}</b>} title={<span style={{ fontWeight: 400 }}>{t(k)}</span>} />)}
        <button className="row tap accent" disabled={!key} style={{ opacity: key ? 1 : 0.4 }}
          onClick={() => key && navigator.clipboard.writeText(widgetScript(key, t('nothingToday'))).then(() => toast(t('copied')))}>📋 {key ? t('copyScript') : t('needKey')}</button>
      </Section>
    </Screen>
  )
}

interface GoogleCalendar { id: string; summary: string; color: string; primary: boolean; writable: boolean; mode: 'full' | 'busy' | 'off' }
interface GoogleStatus {
  configured: boolean; connected: boolean; email?: string; share_events?: boolean; sync_tasks?: boolean
  last_sync?: string | null; last_error?: string | null; calendars?: GoogleCalendar[]; write_calendar?: string
}

function GooglePage() {
  const s = useApp()
  const t = useT()
  const [st, setSt] = useState<GoogleStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const call = async (action: string, extra: object = {}) => {
    const { data, error } = await supabase!.functions.invoke('google', { body: { action, ...extra } })
    if (error) throw error
    return data
  }
  const refresh = () => call('status').then(setSt).catch(() => setSt({ configured: false, connected: false }))
  useEffect(() => { if (SYNC_ENABLED) refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } catch (e) { toast('⚠︎ ' + ((e as Error).message ?? '')) }
    await refresh()
    setBusy(false)
  }
  const redirect = `${SUPABASE_URL}/functions/v1/google`
  const when = st?.last_sync ? new Intl.DateTimeFormat(LOCALES[s.lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(st.last_sync)) : t('never')

  return (
    <Screen title={t('connectGoogle')} back accent="calendar" subtitle={t('gHow')}
      actions={st?.configured ? [st.connected
        ? { icon: '🔄', label: t('gSyncNow'), onClick: () => run(() => call('sync')) }
        : { icon: 'G', label: t('gConnect'), onClick: () => run(async () => { const r = await call('start'); location.href = r.url }) }] : undefined}>
      {!SYNC_ENABLED && <Section><Row title={t('prototype')} /></Section>}
      {(busy || (SYNC_ENABLED && !st)) && <div className="empty" style={{ padding: 12 }}>…</div>}
      {st?.connected && (
        <>
          <Section footer={st.last_error ? `⚠︎ ${st.last_error}` : undefined}>
            <Row icon="✅" title={t('gConnected', { email: st.email ?? 'Google' })} sub={`${t('gLastSync')}: ${when}`} />
          </Section>
          {st.calendars && st.calendars.length > 0 && (
            <Section header={t('gCalendars')} footer={t('gOtherAccount')}>
              {st.calendars.map((c) => {
                return (
                  <Row key={c.id} left={<span className="swatch" style={{ background: c.color, width: 14, height: 14 }} />}
                    title={c.summary} sub={c.primary ? 'Google' : undefined}
                    right={<Switch on={c.mode !== 'off'} onChange={(on) => run(() => {
                      // Send the full on/off map; the server forgets calendars switched off and imports new ones.
                      const map = Object.fromEntries(st.calendars!.map((x) => [x.primary ? 'primary' : x.id, x.id === c.id ? (on ? 'full' : 'off') : x.mode === 'off' ? 'off' : 'full']))
                      return call('settings', { calendars: map })
                    })} />} />
                )
              })}
              {st.calendars.filter((c) => c.writable).length > 1 && (
                <SelectRow label={`✍️ ${t('gWriteTo')}`} value={st.write_calendar ?? 'primary'}
                  onChange={(v) => run(() => call('settings', { write_calendar: v }))}
                  options={st.calendars.filter((c) => c.writable).map((c) => ({ value: c.primary ? 'primary' : c.id, label: c.summary }))} />
              )}
            </Section>
          )}
          <Section>
            <ToggleRow icon="💞" label={t('gShare')} on={!!st.share_events} onChange={(v) => run(() => call('settings', { share_events: v }))} />
            <ToggleRow icon="✅" label={t('gTasks')} on={!!st.sync_tasks} onChange={(v) => run(() => call('settings', { sync_tasks: v }))} />
          </Section>
          <Section>
            <button className="row tap destructive" onClick={() => run(() => call('disconnect'))}>{t('gDisconnect')}</button>
          </Section>
        </>
      )}
      {st && !st.configured && (
        <>
          <Section header={t('gSetup')}>
            {(['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const).map((k, i) => <Row key={k} icon={<b>{i + 1}</b>} title={<span style={{ fontWeight: 400 }}>{t(k)}</span>} />)}
          </Section>
          <Section><CopyRow label={t('gRedirect')} value={redirect} /></Section>
        </>
      )}
    </Screen>
  )
}

/* ---------- Statuses ---------- */
function StatusesPage() {
  const s = useApp()
  const t = useT()
  const nav = useNav()
  const [edit, setEdit] = useState<StatusPreset | null>(null)
  const list = s.prefs.statusPresets
  const save = (next: StatusPreset[]) => setPrefs({ statusPresets: next })
  return (
    <Screen title={t('statuses')} back accent="today" subtitle={t('statusHint')}>
      <Section>
        <ToggleRow icon="👀" label={t('showStatuses')} on={s.prefs.showStatuses} onChange={(showStatuses) => setPrefs({ showStatuses })} />
        <SelectRow label={`⏳ ${t('statusHours')}`} value={String(s.prefs.statusHours)} onChange={(v) => setPrefs({ statusHours: Number(v) })}
          options={[2, 4, 8, 12, 24, 48].map((h) => ({ value: String(h), label: t('hoursN', { n: h }) }))} />
      </Section>
      {([false, true] as const).map((together) => (
        <Section key={String(together)} header={together ? `💞 ${t('together')}` : t('myStatus')}>
          {list.map((p, i) => ({ p, i })).filter(({ p }) => !!p.together === together).map(({ p, i }) => (
            <Row key={p.id} icon={p.emoji} title={p.label} onClick={() => setEdit(p)}
              right={<Order i={i} n={list.length} onMove={(d) => save(move(list, i, d))} />} />
          ))}
          <button className="row tap accent" onClick={() => setEdit({ id: 's-' + uid().slice(0, 6), emoji: '✨', label: '', together })}>＋ {t('newStatus')}</button>
        </Section>
      ))}
      <Section header={t('statusSourceTitle')} footer={t('statusSource')}>
        <Row icon="⚡️" title={t('presets')} chevron onClick={() => nav.settings('shortcuts')} />
      </Section>
      {edit && (
        <Sheet title={`${edit.emoji} ${edit.label || t('newStatus')}`} onClose={() => setEdit(null)} doneDisabled={!edit.label.trim()}
          onDone={() => save(list.some((p) => p.id === edit.id) ? list.map((p) => (p.id === edit.id ? edit : p)) : [...list, edit])}>
          <Section>
            <TextRow value={edit.label} onChange={(label) => setEdit({ ...edit, label })} placeholder={t('title')} autoFocus />
            <ToggleRow icon="💞" label={t('together')} on={!!edit.together} onChange={(together) => setEdit({ ...edit, together: together || undefined })} />
          </Section>
          {!edit.together && (
            <Section footer={t('autoCodeHint', { id: edit.id })}>
              <CopyRow label={t('autoCode')} value={edit.id} />
            </Section>
          )}
          <Section header={t('emoji')}>
            <EmojiPicker value={edit.emoji} onChange={(emoji) => setEdit({ ...edit, emoji })}
              extra={['💼', '⛔️', '🟢', '🚗', '🚙', '🏠', '🏃', '🛒', '😴', '🍽️', '🍿', '🐶', '✈️', '🎮', '📚', '🧘', '🤒', '🎉']} />
          </Section>
          {list.some((p) => p.id === edit.id) && (
            <Section><button className="row tap destructive" onClick={() => { save(list.filter((p) => p.id !== edit.id)); setEdit(null) }}>{t('delete')}</button></Section>
          )}
        </Sheet>
      )}
    </Screen>
  )
}

/* ---------- Ready-made Shortcuts ---------- */
function ShortcutsPage() {
  const s = useApp()
  const t = useT()
  const api = useApiKey()
  const [open, setOpen] = useState<string | null>(null)
  const ru = s.lang === 'ru'
  return (
    <Screen title={t('presets')} back accent="watch" subtitle={t('presetsHint')}>
      <KeySection api={api} />
      {SHORTCUTS.map((p) => {
        const tx = p.text[ru ? 'ru' : 'en']
        const isOpen = open === p.id
        const url = p.route === 'list' ? `${API_BASE}/list?${p.query}&key=${api.key ?? '…'}` : `${API_BASE}/add`
        const body = p.route === 'add' ? JSON.stringify({ key: api.key ?? '…', ...p.fields, ...Object.fromEntries(Object.keys(p.input ?? {}).map((k) => [k, '…'])) }, null, 1) : null
        return (
          <div key={p.id} className="section">
            <div className="list">
              <Row icon={p.emoji} title={tx.title} sub={tx.desc} chevron onClick={() => setOpen(isOpen ? null : p.id)} />
              {isOpen && (
                <>
                  <Row icon="📍" title={<span style={{ fontWeight: 400 }}>{t('runFrom')}: {tx.runFrom}</span>} />
                  {presetSteps(p, s.lang).map((step, i) => <Row key={i} icon={<b>{i + 1}</b>} title={<span style={{ fontWeight: 400 }}>{step}</span>} />)}
                  <CopyRow label={t('apiUrl')} value={api.key || p.route === 'add' ? url : t('needKey')} />
                  {body && <CopyRow label="JSON" value={body} />}
                </>
              )}
            </div>
          </div>
        )
      })}
    </Screen>
  )
}

/* ---------- Data ---------- */
function DataPage() {
  const s = useApp()
  const t = useT()
  const file = useRef<HTMLInputElement>(null)
  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `family-hub-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const importData = async (f?: File) => {
    if (!f) return
    try {
      const data = JSON.parse(await f.text()) as Partial<State>
      // Go through update() so every imported record is synced too; who "I am" never changes.
      update((st) => { const me = st.me; Object.assign(st, data); st.me = me })
      toast(t('importDone'))
    } catch { toast('⚠︎') }
  }
  return (
    <Screen title={t('data')} back accent="settings">
      <Section>
        <button className="row tap accent" onClick={exportData}>⬇️ {t('export')}</button>
        <button className="row tap accent" onClick={() => file.current?.click()}>⬆️ {t('importData')}</button>
        {!SYNC_ENABLED && <button className="row tap accent" onClick={() => { if (confirm(t('resetConfirm'))) replaceState({ ...demoState(), lang: s.lang }) }}>↺ {t('reset')}</button>}
        {/* Empties every list but keeps people, sections, design and the rest of the settings. In sync mode
            this goes through update() so the deletions reach the other phone too. */}
        <button className="row tap destructive" onClick={() => {
          if (!confirm(SYNC_ENABLED ? t('clearConfirmSync') : t('clearConfirm'))) return
          update((st) => {
            for (const k of ['groceries', 'tasks', 'events', 'expenses', 'recurring', 'goals', 'watch', 'music', 'recipes', 'petRecords', 'weights', 'notes', 'trips', 'photos', 'periods'] as const) {
              ;(st[k] as { privateTo?: string; createdBy?: string }[]) = (st[k] as { privateTo?: string }[]).filter((x) => x.privateTo && x.privateTo !== st.me)
            }
          })
          toast('🧹 ✓')
        }}>🧹 {t('clearData')}</button>
      </Section>
      <input ref={file} type="file" accept="application/json" hidden onChange={(e) => importData(e.target.files?.[0])} />
      {!SYNC_ENABLED && <div className="section-footer" style={{ margin: '0 14px' }}>{t('prototype')}</div>}
    </Screen>
  )
}
