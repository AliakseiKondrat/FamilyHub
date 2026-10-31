import { useState, type CSSProperties } from 'react'
import { useT } from '../i18n'
import { signIn, signOut, signUp, useSync } from '../sync'

/** Email + password: works inside the installed iPhone app, unlike magic links that open in Safari. */
export default function Login() {
  const t = useT()
  const sync = useSync()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null)

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    if (mode === 'in') {
      const err = await signIn(email.trim(), password)
      if (err) setMsg({ text: err })
    } else {
      const r = await signUp(email.trim(), password)
      if (r.error) setMsg({ text: r.error })
      else if (r.needsConfirm) { setMsg({ text: t('checkEmail'), ok: true }); setMode('in') }
    }
    setBusy(false)
  }

  if (sync.status === 'noAccess') {
    return (
      <div className="login">
        <div className="login-logo lg on-accent">🔒</div>
        <p className="login-msg">{t('noAccess', { email: sync.email ?? '' })}</p>
        <button className="glass-btn lg login-btn" onClick={() => signOut()}>{t('signOut')}</button>
      </div>
    )
  }

  const ready = email.includes('@') && password.length >= 6
  return (
    <div className="login">
      <div className="login-logo lg on-accent" style={{ width: 92 } as CSSProperties}>❤️</div>
      <h1>Family Hub</h1>
      <p className="login-tag">{t('tagline')}</p>
      <div className="login-form lg on-accent">
        <div className="row"><input type="email" autoComplete="email" inputMode="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="row"><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={t('password')} value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ready) submit() }} /></div>
      </div>
      {msg && <p className="login-msg" style={{ color: msg.ok ? '#d9ffe6' : '#ffe1e1' }}>{msg.ok ? '✓ ' : '⚠︎ '}{msg.text}</p>}
      <button className="glass-btn lg login-btn" disabled={!ready || busy} style={{ opacity: !ready || busy ? 0.5 : 1 }} onClick={submit}>
        {busy ? '…' : mode === 'in' ? t('signIn') : t('signUp')}
      </button>
      <button className="login-switch" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
        {mode === 'in' ? t('noAccount') : t('haveAccount')}
      </button>
    </div>
  )
}
