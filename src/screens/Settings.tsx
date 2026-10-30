import { useState } from 'react'
import { getState, replaceState, update, useApp } from '../store'
import { DEFAULT_EMOJI, LANG_NAMES, moduleLabel, useT } from '../i18n'
import { Row, Screen, Section, Segmented, SelectRow, Sheet, TextRow, emojiList } from '../ui'
import { demoState } from '../demo'
import { SYNC_ENABLED } from '../config'
import { signOut, useSync } from '../sync'
import type { Lang, ModuleId, Theme, UserId } from '../types'

const ALL: ModuleId[] = ['today', 'calendar', 'tasks', 'groceries', 'budget', 'photos', 'watch', 'recipes', 'pet', 'home', 'travel', 'dates', 'inbox', 'archive', 'cycle']

export default function Settings() {
  const s = useApp()
  const t = useT()
  const sync = useSync()
  const [mod, setMod] = useState<ModuleId | null>(null)
  const [person, setPerson] = useState<UserId | null>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vdvoem-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <Screen title={t('settings')} back>
      {SYNC_ENABLED ? (
        <Section header={t('account')} footer={t('installHint')}>
          <Row icon={s.users[s.me].emoji} title={s.users[s.me].name} sub={sync.email} />
          <Row icon={!sync.online ? '📴' : sync.pending ? '⏳' : '☁️'}
            title={!sync.online ? t('offline') : sync.pending ? t('pendingN', { n: sync.pending }) : t('synced')} />
          <button className="row tap destructive" onClick={() => signOut()}>{t('signOut')}</button>
        </Section>
      ) : <>
        <Section footer={t('prototype')}>
          <Row icon="🧪" title={<span style={{ fontSize: 15, color: 'var(--label2)' }}>{t('install')}</span>} sub={t('installHint')} />
        </Section>
        <div style={{ margin: '0 16px' }}>
          <div className="section-header">{t('iAm')}</div>
          <Segmented inSheet value={s.me} onChange={(me) => update((st) => { st.me = me })}
            options={(['a', 'j'] as UserId[]).map((u) => ({ value: u, label: `${s.users[u].emoji} ${s.users[u].name}` }))} />
          <div className="section-footer" style={{ marginTop: -12, marginBottom: 24 }}>{t('iAmHint')}</div>
        </div>
      </>}

      <Section header={t('people')}>
        {(['a', 'j'] as UserId[]).map((u) => (
          <Row key={u} icon={s.users[u].emoji} title={s.users[u].name} chevron onClick={() => setPerson(u)} />
        ))}
      </Section>

      <Section>
        <SelectRow label={`🌐 ${t('language')}`} value={s.lang} onChange={(lang) => update((st) => { st.lang = lang })}
          options={(Object.keys(LANG_NAMES) as Lang[]).map((l) => ({ value: l, label: LANG_NAMES[l] }))} />
        <SelectRow label={`📍 ${t('country')}`} value={s.country} onChange={(country) => update((st) => { st.country = country })}
          options={[{ value: 'PL', label: `🇵🇱 ${t('poland')} · PLN` }, { value: 'ES', label: `🇪🇸 ${t('spain')} · EUR` }]} />
        <SelectRow label={`🎨 ${t('theme')}`} value={s.theme} onChange={(theme) => update((st) => { st.theme = theme })}
          options={(['auto', 'light', 'dark'] as Theme[]).map((x) => ({ value: x, label: t(`theme.${x}`) }))} />
      </Section>

      <Section header={t('sections')} footer={t('sectionsHint')}>
        {ALL.filter((m) => m !== 'cycle' || s.me === 'j').map((m) => {
          const l = moduleLabel(s, m)
          return <Row key={m} icon={l.emoji} title={l.title} chevron onClick={() => setMod(m)} />
        })}
      </Section>

      <Section header={t('integrations')}>
        <Row icon={<span style={{ fontWeight: 700, color: '#4285f4' }}>G</span>} title={t('connectGoogle')} detail={t('soon')} />
        <Row icon="🎙️" title={t('siri')} detail={t('soon')} />
        <Row icon="🧩" title={t('widgets')} detail={t('soon')} />
        <Row icon="🔔" title={t('push')} detail={t('soon')} />
      </Section>

      <Section header={t('data')}>
        <button className="row tap accent" onClick={exportData}>⬇️ {t('export')}</button>
        {!SYNC_ENABLED && <button className="row tap destructive" onClick={() => { if (confirm(t('resetConfirm'))) replaceState({ ...demoState(), lang: s.lang }) }}>{t('reset')}</button>}
      </Section>

      {mod && <ModuleSheet id={mod} onClose={() => setMod(null)} />}
      {person && <PersonSheet id={person} onClose={() => setPerson(null)} />}
    </Screen>
  )
}

function ModuleSheet({ id, onClose }: { id: ModuleId; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [title, setTitle] = useState(s.modules[id]?.title ?? '')
  const [emoji, setEmoji] = useState(moduleLabel(s, id).emoji)
  const def = t(`mod.${id}` as 'mod.today')
  return (
    <Sheet title={`${emoji} ${title || def}`} onClose={onClose}
      onDone={() => update((st) => { st.modules[id] = { title: title.trim() || undefined, emoji: emoji === DEFAULT_EMOJI[id] ? undefined : emoji } })}>
      <Section footer={`${t('defaultName')}: ${def}`}>
        <TextRow value={title} onChange={setTitle} placeholder={def} autoFocus />
      </Section>
      <Section header={t('emoji')}>
        <div className="emoji-grid">
          {emojiList().map((e) => <button key={e} className={e === emoji ? 'on' : ''} onClick={() => setEmoji(e)}>{e}</button>)}
        </div>
        <TextRow value={emoji} onChange={(v) => setEmoji([...new Intl.Segmenter().segment(v)].pop()?.segment ?? '')} placeholder="🙂" />
      </Section>
      <Section>
        <button className="row tap destructive" onClick={() => { update((st) => { delete st.modules[id] }); onClose() }}>{t('defaultName')}</button>
      </Section>
    </Sheet>
  )
}

function PersonSheet({ id, onClose }: { id: UserId; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(s.users[id])
  return (
    <Sheet title={v.name} onClose={onClose} onDone={() => update((st) => { st.users[id] = v })}>
      <Section>
        <TextRow value={v.name} onChange={(name) => setV({ ...v, name })} placeholder={t('name')} />
      </Section>
      <Section header={t('emoji')}>
        <div className="emoji-grid">
          {['🧔', '👨', '🧑', '👱‍♂️', '👩', '👱‍♀️', '👩‍🦰', '🧑‍🦱', '🐻', '🦊', '🐰', '🐱', '🌸', '⭐️', '🌙', '☀️'].map((e) => (
            <button key={e} className={e === v.emoji ? 'on' : ''} onClick={() => setV({ ...v, emoji: e })}>{e}</button>
          ))}
        </div>
      </Section>
    </Sheet>
  )
}
