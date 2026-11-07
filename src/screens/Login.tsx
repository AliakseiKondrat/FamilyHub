import { useState, type CSSProperties } from 'react'
import { useT, type TKey } from '../i18n'
import { signIn, signUp, useSync } from '../sync'
import { PairingScreen } from './Pairing'
import { inTelegram, telegramSignIn } from '../lib/telegram'

/** Server errors in plain words; the common one for newcomers ("Sign in" with a new address) points to sign-up. */
function errKey(m: string): TKey | null {
  const x = m.toLowerCase()
  if (x.includes('invalid login credentials')) return 'login.err.creds'
  if (x.includes('already registered') || x.includes('already exists')) return 'login.err.exists'
  if (x.includes('password should') || x.includes('weak')) return 'login.err.weak'
  if (x.includes('email') && (x.includes('invalid') || x.includes('validate'))) return 'login.err.email'
  if (x.includes('rate limit') || x.includes('too many')) return 'login.err.rate'
  if (x.includes('fetch') || x.includes('network')) return 'login.err.net'
  return null
}

/** Email + password: works inside the installed iPhone app, unlike magic links that open in Safari. */
export default function Login() {
  const t = useT()
  const sync = useSync()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok?: boolean; hint?: boolean } | null>(null)

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    if (mode === 'in') {
      const err = await signIn(email.trim(), password)
      if (err) { const k = errKey(err); setMsg({ text: k ? t(k) : err, hint: k === 'login.err.creds' }) }
    } else {
      const r = await signUp(email.trim(), password)
      if (r.error) { const k = errKey(r.error); setMsg({ text: k ? t(k) : r.error }); if (k === 'login.err.exists') setMode('in') }
      else if (r.needsConfirm) { setMsg({ text: t('checkEmail'), ok: true }); setMode('in') }
    }
    setBusy(false)
  }

  // Signed in but not in a couple yet: create one or join the partner's with a code.
  if (sync.status === 'noAccess') return <PairingScreen />

  const ready = email.includes('@') && password.length >= 6
  return (
    <div className="login">
      <div className="login-logo lg on-accent" style={{ width: 92 } as CSSProperties}>❤️</div>
      <h1>Family Hub</h1>
      <p className="login-tag">{t('tagline')}</p>
      <div className="login-tabs" role="tablist">
        {(['in', 'up'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => { setMode(m); setMsg(null) }}>{t(m === 'in' ? 'signIn' : 'signUp')}</button>
        ))}
      </div>
      {mode === 'up' && <p className="login-hint on-dark">{t('login.upHint')}</p>}
      <div className="login-form lg on-accent">
        <div className="row"><input type="email" autoComplete="email" inputMode="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="row"><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={t('password')} value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ready) submit() }} /></div>
      </div>
      {msg && <p className="login-msg" style={{ color: msg.ok ? '#d9ffe6' : '#ffe1e1' }}>{msg.ok ? '✓ ' : '⚠︎ '}{msg.text}</p>}
      {msg?.hint && mode === 'in' && <button className="glass-btn lg login-btn" onClick={() => { setMode('up'); setMsg(null) }}>✨ {t('login.createNow')}</button>}
      <button className="glass-btn lg login-btn" disabled={!ready || busy} style={{ opacity: !ready || busy ? 0.5 : 1 }} onClick={submit}>
        {busy ? '…' : mode === 'in' ? t('signIn') : t('signUp')}
      </button>
      {inTelegram() && (
        <button className="glass-btn lg login-btn" disabled={busy} onClick={async () => { setBusy(true); const err = await telegramSignIn(); setBusy(false); if (err) setMsg({ text: err }) }}>
          ✈️ {t('tg.signIn')}
        </button>
      )}
      {inTelegram() && <div className="login-hint">{t('tg.signInHint')}</div>}
    </div>
  )
}
