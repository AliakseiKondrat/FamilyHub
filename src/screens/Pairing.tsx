import { useEffect, useState } from 'react'
import { useT, type TKey } from '../i18n'
import { Empty, Icon, Row, Screen, Section, Segmented, Sheet, TextRow, toast } from '../ui'
import { supabase } from '../lib/supabase'
import { getHousehold, refreshSession, signOut, useSync } from '../sync'
import { useApp } from '../store'

/*
 * Couples on their own: create a couple (you get a 6-character code for your partner) or join one with a code.
 * Links: ?join=CODE fills the code in; ?ref=hN (another couple's «invite friends» link) records who invited whom.
 * Also: FAQ, feedback (bug / idea) and «delete my data».
 */

const APP_URL = 'https://aliakseikondrat.github.io/FamilyHub/'
const JOIN_KEY = 'familyhub:join', REF_KEY = 'familyhub:ref'
const store = { get: (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }, set: (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k) } catch { /* ignore */ } } }

/** Remember ?join= and ?ref= from the link the app was opened with (they must survive sign-up). */
export function takeInviteParams() {
  const q = new URLSearchParams(location.search)
  const join = q.get('join'), ref = q.get('ref')
  if (join) store.set(JOIN_KEY, join.toUpperCase().slice(0, 12))
  if (ref && /^h\d+$/.test(ref)) store.set(REF_KEY, ref)
}

const PROTECTED = ['h1', 'h2', 'h3']
const errText = (t: ReturnType<typeof useT>, e: { message?: string } | null) => {
  const m = e?.message ?? ''
  return m.includes('invite not found') ? t('pair.badCode') : m.includes('couple is full') ? t('pair.full') : m.includes('already') ? t('pair.already') : t('dev.err', { msg: m || '?' })
}

/** Signed in, but not in any couple yet. */
export function PairingScreen() {
  const t = useT()
  const sync = useSync()
  const [mode, setMode] = useState<'choose' | 'join'>(store.get(JOIN_KEY) ? 'join' : 'choose')
  const [code, setCode] = useState(store.get(JOIN_KEY))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const create = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase!.rpc('create_household', { ref: store.get(REF_KEY) || null })
    setBusy(false)
    if (error) { setMsg(errText(t, error)); return }
    store.set(REF_KEY, '')
    await refreshSession()
  }
  const join = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase!.rpc('join_household', { invite: code.trim() })
    setBusy(false)
    if (error) { setMsg(errText(t, error)); return }
    store.set(JOIN_KEY, '')
    await refreshSession()
  }
  return (
    <div className="login">
      <div className="login-logo lg on-accent">💞</div>
      <h1>{t('pair.welcome')}</h1>
      <p className="login-tag">{t('pair.signedAs', { email: sync.email ?? '' })}</p>
      {mode === 'choose' ? <>
        <button className="glass-btn lg login-btn" disabled={busy} onClick={create}>{busy ? '…' : `💞 ${t('pair.create')}`}</button>
        <p className="login-msg" style={{ marginTop: 6 }}>{t('pair.createHint')}</p>
        <button className="glass-btn lg login-btn" onClick={() => setMode('join')}>🔑 {t('pair.haveCode')}</button>
      </> : <>
        <div className="login-form lg on-accent">
          <div className="row"><input placeholder={t('pair.codePlaceholder')} value={code} autoCapitalize="characters" maxLength={12}
            onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter' && code.trim().length >= 6) join() }} /></div>
        </div>
        <button className="glass-btn lg login-btn" disabled={busy || code.trim().length < 6} style={{ opacity: busy || code.trim().length < 6 ? 0.5 : 1 }} onClick={join}>{busy ? '…' : t('pair.join')}</button>
        <button className="login-switch" onClick={() => setMode('choose')}>← {t('pair.back')}</button>
      </>}
      {msg && <p className="login-msg" style={{ color: '#ffe1e1' }}>⚠︎ {msg}</p>}
      <button className="login-switch" onClick={() => signOut()}>{t('signOut')}</button>
    </div>
  )
}

const share = async (text: string, url: string, t: ReturnType<typeof useT>) => {
  try {
    if (navigator.share) await navigator.share({ text, url })
    else { await navigator.clipboard.writeText(`${text} ${url}`); toast(t('copied')) }
  } catch { /* cancelled */ }
}

/** Settings: the partner's invite while we're one, and «invite another couple». */
export function InviteSection() {
  const t = useT()
  const s = useApp()
  const sync = useSync()
  const [code, setCode] = useState<string | null>(null)
  const hh = getHousehold()
  useEffect(() => { if (supabase && sync.status === 'ready') supabase.rpc('my_invite').then(({ data }) => setCode((data as string) || null)) }, [sync.status])
  if (!supabase || !hh) return null
  const joinUrl = code ? `${APP_URL}?join=${code}` : ''
  const refUrl = `${APP_URL}?ref=${hh}`
  return (
    <Section header={t('pair.invites')} footer={code ? t('pair.partnerHint') : t('pair.friendsHint')}>
      {code && <>
        <Row icon="🔑" title={t('pair.yourCode')} detail={<b className="pair-code">{code}</b>} />
        <button className="row tap accent" onClick={() => share(t('pair.shareText', { name: s.users[s.me].name }), joinUrl, t)}>💞 {t('pair.invitePartner')}</button>
      </>}
      <button className="row tap accent" onClick={() => share(t('pair.shareFriends'), refUrl, t)}>🫶 {t('pair.inviteFriends')}</button>
    </Section>
  )
}

/** Questions by topic; numbers are the faq.qN / faq.aN keys. */
export const FAQ: { id: string; emoji: string; qs: number[] }[] = [
  { id: 'basics', emoji: '🚀', qs: [9, 10, 11, 3, 12, 25] },
  { id: 'couple', emoji: '💞', qs: [1, 2, 13, 14] },
  { id: 'notify', emoji: '🔔', qs: [4, 15, 16, 17] },
  { id: 'game', emoji: '🔥', qs: [5, 18, 19, 20, 6, 21, 22] },
  { id: 'data', emoji: '💾', qs: [7, 23, 24, 8] },
]
let faqFocus: number | null = null
/** Open the FAQ with this question unfolded (from the settings search). */
export const focusFaq = (n: number) => { faqFocus = n }

/** Settings: questions people ask, by topic, with search; answers fold out one at a time. */
export function FaqPage() {
  const t = useT()
  // Read in the initializer, cleared after mount (StrictMode runs initializers twice).
  const [open, setOpen] = useState<number | null>(() => faqFocus)
  useEffect(() => { faqFocus = null }, [])
  const [cat, setCat] = useState<string>(() => (open ? FAQ.find((c) => c.qs.includes(open))?.id ?? 'all' : 'all'))
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const match = (n: number) => !needle || `${t(`faq.q${n}` as TKey)} ${t(`faq.a${n}` as TKey)}`.toLowerCase().includes(needle)
  const groups = FAQ.filter((c) => needle || cat === 'all' || c.id === cat).map((c) => ({ ...c, qs: c.qs.filter(match) })).filter((c) => c.qs.length)
  return (
    <Screen title={t('faq.title')} back accent="settings" searchable={false}
      head={<>
        <div className="quick lg">
          <span style={{ position: 'relative', zIndex: 2 }}><Icon name="search" style={{ width: 18, height: 18 }} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('faq.search')} enterKeyHint="search" />
          {q && <button className="plus" onClick={() => setQ('')} aria-label="Clear"><Icon name="close" /></button>}
        </div>
        {!needle && (
          <div className="chips" style={{ paddingTop: 12 }}>
            {[{ id: 'all', emoji: '✨' }, ...FAQ].map((c) => (
              <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.emoji} {t(`faq.c.${c.id}` as TKey)}</button>
            ))}
          </div>
        )}
      </>}>
      {groups.length === 0 && <Empty emoji="🤷" text={t('noResults')} />}
      {groups.map((c) => (
        <Section key={c.id} header={`${c.emoji} ${t(`faq.c.${c.id}` as TKey)}`} className="compact faq">
          {c.qs.map((n) => {
            const on = open === n || (!!needle && c.qs.length <= 3)
            return (
              <div key={n} className={'faq-item' + (on ? ' on' : '')}>
                <Row title={t(`faq.q${n}` as TKey)} right={<span className="faq-chev" aria-hidden>›</span>} onClick={() => setOpen(open === n ? null : n)} />
                {on && <div className="row faq-a">{t(`faq.a${n}` as TKey)}</div>}
              </div>
            )
          })}
        </Section>
      ))}
    </Screen>
  )
}

/** Settings: tell us about a bug or an idea. */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [kind, setKind] = useState<'bug' | 'idea' | 'other'>('idea')
  const [text, setText] = useState('')
  const send = async () => {
    if (!supabase) { toast(t('dev.offline')); return }
    const { error } = await supabase.from('feedback').insert({ kind, text: text.trim() })
    toast(error ? t('dev.err', { msg: error.message }) : t('fb.thanks'))
  }
  return (
    <Sheet title={`💬 ${t('fb.title')}`} onClose={onClose} onDone={send} doneDisabled={!text.trim()}>
      <div style={{ margin: '0 16px 12px' }}>
        <Segmented inSheet value={kind} onChange={setKind} options={[{ value: 'bug', label: `🐞 ${t('fb.bug')}` }, { value: 'idea', label: `💡 ${t('fb.idea')}` }, { value: 'other', label: `💬 ${t('fb.other')}` }]} />
      </div>
      <Section footer={t('fb.hint')}><TextRow value={text} onChange={setText} placeholder={t('fb.placeholder')} multiline autoFocus /></Section>
    </Sheet>
  )
}

/** Settings: delete my data (typed confirmation); never offered to our own couples. */
export function DeleteDataSection() {
  const t = useT()
  const [ask, setAsk] = useState(false)
  const [word, setWord] = useState('')
  const hh = getHousehold()
  if (!supabase || !hh || PROTECTED.includes(hh)) return null
  const really = t('del.word')
  const run = async () => {
    const { error } = await supabase!.rpc('delete_my_data')
    if (error) { toast(t('dev.err', { msg: error.message })); return }
    toast(t('del.done'))
    await signOut()
  }
  return <>
    <Section footer={t('del.hint')}><button className="row tap destructive" onClick={() => setAsk(true)}>🗑️ {t('del.title')}</button></Section>
    {ask && (
      <Sheet title={t('del.title')} onClose={() => { setAsk(false); setWord('') }}>
        <div className="col-hint" style={{ margin: '0 30px 12px' }}>{t('del.explain', { word: really })}</div>
        <Section><TextRow value={word} onChange={setWord} placeholder={really} autoFocus /></Section>
        <Section><button className="row tap destructive" disabled={word.trim().toUpperCase() !== really.toUpperCase()} style={word.trim().toUpperCase() !== really.toUpperCase() ? { opacity: 0.4 } : undefined} onClick={run}>{t('del.confirm')}</button></Section>
      </Sheet>
    )}
  </>
}

/** Developer panel: what people wrote to us. */
export function FeedbackList() {
  const t = useT()
  const [items, setItems] = useState<{ id: number; kind: string; text: string; household: string | null; created_at: string }[] | null>(null)
  useEffect(() => { supabase?.from('feedback').select('id, kind, text, household, created_at').order('created_at', { ascending: false }).limit(30).then(({ data }) => setItems(data ?? [])) }, [])
  if (!supabase) return null
  return (
    <Section header={`💬 ${t('fb.inbox')}`}>
      {items?.length === 0 && <Row title={<span style={{ color: 'var(--label2)', fontWeight: 400 }}>{t('empty')}</span>} />}
      {items?.map((f) => <Row key={f.id} icon={f.kind === 'bug' ? '🐞' : f.kind === 'idea' ? '💡' : '💬'} title={<span style={{ fontWeight: 400 }}>{f.text}</span>} sub={`${f.household ?? '—'} · ${f.created_at.slice(0, 10)}`} />)}
    </Section>
  )
}
