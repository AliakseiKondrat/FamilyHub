import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { useT } from '../i18n'
import { Row, Screen, Section, Segmented, TextRow, haptic, toast } from '../ui'
import { supabase } from '../lib/supabase'
import { SYNC_ENABLED } from '../config'
import { levelOf } from '../lib/game'
import { progressionOf } from '../lib/progression'

/*
 * Leaderboards, opt-in: a couple shows up only after joining, under a nickname of its choice, with its level, days
 * together, best flame and passport stamps — nothing else about them. XP is counted by the server from the shared
 * record with the same daily cap, so nobody can inflate it. «Friends» = couples linked to us by invitations.
 */

interface Entry { nickname: string; emoji: string; xp: number; days: number; flame: number; stamps: number; mine: boolean }

export default function LeadersPage() {
  const s = useApp()
  const t = useT()
  const r = progressionOf(s)
  const [scope, setScope] = useState<'all' | 'friends'>('all')
  const [list, setList] = useState<Entry[] | null>(null)
  const [nick, setNick] = useState(`${s.users.a.name} & ${s.users.j.name}`)
  const [busy, setBusy] = useState(false)
  const me = list?.find((e) => e.mine)

  const load = async () => {
    if (!supabase) { setList([]); return }
    const { data, error } = await supabase.rpc('leaderboard_list', { p_friends: scope === 'friends' })
    if (error) { toast('⚠︎ ' + error.message); setList([]); return }
    setList(data as Entry[])
  }
  useEffect(() => { load() }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps
  // Keep our own flame and stamps fresh while we're in.
  useEffect(() => {
    if (me && supabase && (me.flame !== r.p.best || me.stamps !== r.m.stamps.length)) {
      supabase.rpc('leaderboard_join', { p_nickname: me.nickname, p_emoji: me.emoji, p_flame: r.p.best, p_stamps: r.m.stamps.length }).then(() => load())
    }
  }, [me?.nickname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (me) setNick(me.nickname) }, [me?.nickname])

  const join = async () => {
    setBusy(true)
    const { error } = await supabase!.rpc('leaderboard_join', { p_nickname: nick.trim(), p_emoji: s.users.a.emoji + s.users.j.emoji, p_flame: r.p.best, p_stamps: r.m.stamps.length })
    setBusy(false)
    if (error) { toast('⚠︎ ' + error.message); return }
    haptic(); toast(t('lb.joined')); load()
  }
  const leave = async () => {
    setBusy(true)
    await supabase!.rpc('leaderboard_leave')
    setBusy(false); load()
  }

  if (!SYNC_ENABLED) return <Screen title={t('lb.title')} back accent="us"><Section footer={t('lb.offline')}><Row icon="🏆" title={t('lb.title')} /></Section></Screen>
  return (
    <Screen title={t('lb.title')} back accent="us" subtitle={t('lb.sub')}>
      <Segmented value={scope} onChange={setScope} options={[{ value: 'all', label: t('lb.all') }, { value: 'friends', label: t('lb.friends') }]} />
      <Section footer={scope === 'friends' ? t('lb.friendsHint') : t('lb.hint')}>
        {list === null ? <Row title="…" />
          : list.length === 0 ? <Row icon="🏆" title={t('lb.empty')} />
          : list.map((e, i) => {
            const lv = levelOf(e.xp).level
            return (
              <Row key={i} icon={<span className="lb-rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>}
                title={<span className={e.mine ? 'lb-me' : undefined}>{e.emoji} {e.nickname}</span>}
                sub={`⭐ ${t('us.level', { n: lv })} · 📅 ${e.days} · 🔥 ${e.flame} · 🛂 ${e.stamps}`} />
            )
          })}
      </Section>
      <Section header={t('lb.us')} footer={t('lb.privacy')}>
        <TextRow placeholder={t('lb.nick')} value={nick} onChange={setNick} />
        {me
          ? <>
              <button className="row tap accent" disabled={busy || !nick.trim()} onClick={join}>💾 {t('lb.save')}</button>
              <button className="row tap destructive" disabled={busy} onClick={leave}>{t('lb.leave')}</button>
            </>
          : <button className="row tap accent" disabled={busy || !nick.trim()} onClick={join}>🏆 {t('lb.join')}</button>}
      </Section>
    </Screen>
  )
}
