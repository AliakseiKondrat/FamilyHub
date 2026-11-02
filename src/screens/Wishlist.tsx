import { useState } from 'react'
import { base, other, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import {
  Empty, EmojiField, GlassButton, Marks, Screen, Section, Segmented, Sheet, TextRow, ToggleRow, VisibilityFields, haptic, toast,
} from '../ui'
import { CoverBox, CoverPicker, fromPreview, relink, useAutoCovers } from '../cover'
import { fmtMoney } from '../lib/date'
import { recordEmoji } from '../lib/emoji'
import { currencyOf } from './Budget'
import type { State, UserId, Wish, WishClaim } from '../types'

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP']

/** My private "I'll gift this" mark for a wish, if any (the other person's device never receives it). */
const claimOf = (s: State, wishId: string) => visible(s.wishClaims, s.me).find((c) => c.wishId === wishId && c.privateTo === s.me)

function setClaim(wishId: string, on: boolean) {
  update((st) => {
    st.wishClaims = st.wishClaims.filter((c) => !(c.wishId === wishId && c.privateTo === st.me))
    if (on) st.wishClaims.unshift({ ...base(st.me), wishId, privateTo: st.me })
  })
}

export default function Wishlist({ back }: { back?: boolean }) {
  const s = useApp()
  const t = useT()
  const partner = other(s.me)
  const [tab, setTab] = useState<'gift' | 'dream'>('gift')
  const [whose, setWhose] = useState<UserId>(s.me)
  const [edit, setEdit] = useState<Wish | null>(null)
  const all = visible(s.wishes, s.me)
  useAutoCovers(all, (id, p) => update((st) => { const x = st.wishes.find((k) => k.id === id); if (x) Object.assign(x, fromPreview(x, p)) }))

  const list = all.filter((w) => w.kind === tab && (tab === 'dream' || w.owner === whose))
  const open = list.filter((w) => !w.got).sort((a, b) => Number(!!b.top) - Number(!!a.top))
  const done = list.filter((w) => w.got)
  const cur = currencyOf(s)
  const total = open.filter((w) => w.price && (w.currency ?? cur) === cur).reduce((a, w) => a + (w.price ?? 0), 0)

  const card = (w: Wish) => {
    const mine = claimOf(s, w.id)
    // Only show gifting marks on the partner's wishes: on my own I must not learn anything.
    const showClaim = w.owner !== s.me && !!mine
    return (
      <div key={w.id} className={'wish-card' + (w.got ? ' got' : '')} role="button" tabIndex={0} onClick={() => setEdit(w)}>
        <CoverBox className="wish-img" src={w.cover} fallback={<span>{recordEmoji(w) ?? (w.kind === 'dream' ? '✨' : '🎁')}</span>}>
          {w.top && <span className="wish-top">❤️</span>}
          {showClaim && <span className="wish-claim">🎁 {mine!.bought ? t('wishBought') : t('wishIGiftOn')}</span>}
        </CoverBox>
        <div className="wish-body">
          <div className="wish-title">{w.title} <Marks x={w} /></div>
          {w.price ? <div className="wish-price">{fmtMoney(w.price, w.currency ?? cur, s.lang)}</div>
            : w.site ? <div className="wish-site">{w.site}</div> : null}
        </div>
      </div>
    )
  }

  const newWish = (): Wish => ({ ...base(s.me), title: '', owner: tab === 'dream' ? 'both' : whose, kind: tab, currency: cur })
  return (
    <Screen title={moduleLabel(s, 'wishlist').title} back={back} accent="wishlist"
      subtitle={total > 0 ? t('wishTotal', { sum: fmtMoney(total, cur, s.lang) }) : undefined}
      right={<GlassButton icon="plus" label={t('wishNew')} onClick={() => setEdit(newWish())} />}
      head={<>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'gift', label: `🎁 ${t('wishGifts')}` }, { value: 'dream', label: `✨ ${t('wishDreams')}` }]} />
        {tab === 'gift' && (
          <div className="chips" style={{ paddingBottom: 0 }}>
            {[s.me, partner].map((u) => (
              <button key={u} className={'chip' + (whose === u ? ' on' : '')} onClick={() => { haptic(); setWhose(u) }}>
                {s.users[u].emoji} {u === s.me ? t('wantsMe') : t('wantsName', { name: s.users[u].name })}
              </button>
            ))}
          </div>
        )}
      </>}>
      {tab === 'gift' && <div className="wish-note">🔒 {t('wishPrivacy')}</div>}
      {open.length === 0 && done.length === 0 && (
        <Empty emoji={tab === 'dream' ? '✨' : '🎁'} text={tab === 'dream' ? t('wishEmptyDreams') : whose === s.me ? t('wishEmptyMine') : t('wishEmptyPartner', { name: s.users[partner].name })} />
      )}
      {open.length > 0 && <div className="wish-grid">{open.map(card)}</div>}
      {done.length > 0 && <>
        <div className="section-header" style={{ padding: '6px 30px 8px' }}><span>✅ {t('wishDone')}</span></div>
        <div className="wish-grid">{done.map(card)}</div>
      </>}
      {edit && <WishEditor wish={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

function WishEditor({ wish, onClose }: { wish: Wish; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(wish)
  const isNew = !s.wishes.some((w) => w.id === wish.id)
  const partner = other(s.me)
  const claim: WishClaim | undefined = claimOf(s, wish.id)
  const forPartner = !isNew && v.owner === partner
  const save = () => update((st) => {
    const x = { ...v, title: v.title.trim() }
    if (isNew) st.wishes.unshift(x)
    else st.wishes = st.wishes.map((w) => (w.id === x.id ? x : w))
  })
  return (
    <Sheet title={isNew ? t('wishNew') : v.title} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <TextRow value={v.url ?? ''} onChange={(url) => setV({ ...v, url: url || undefined, ...relink(v, url) })} placeholder={`🔗 ${t('link')}`} />
        <div className="row">
          <span className="label">💰 {t('wishPrice')}</span>
          <input className="pill-input" inputMode="decimal" value={v.price ?? ''} placeholder="—" style={{ width: 96, textAlign: 'right' }}
            onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); setV({ ...v, price: e.target.value && Number.isFinite(n) ? n : undefined }) }} />
          <select value={v.currency ?? currencyOf(s)} onChange={(e) => setV({ ...v, currency: e.target.value })} style={{ width: 'auto', flex: 'none' }}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      {(v.url || v.cover) && <CoverPicker id={v.id} url={v.url} cover={v.cover} title={v.title} emoji="🎁" onChange={(p) => setV((x) => ({ ...x, ...p }))} />}

      {forPartner && (
        <Section footer={t('wishGiftHint', { name: s.users[partner].name })}>
          <ToggleRow icon="🎁" label={t('wishIGift')} on={!!claim} onChange={(on) => { setClaim(v.id, on); if (on) toast(`🎁 ${t('wishIGiftOn')}`) }} />
          {claim && <ToggleRow icon="🛍️" label={t('wishBought')} on={!!claim.bought}
            onChange={(bought) => update((st) => { const c = st.wishClaims.find((x) => x.id === claim.id); if (c) c.bought = bought })} />}
        </Section>
      )}

      <Section>
        <ToggleRow icon="❤️" label={t('wishTop')} on={!!v.top} onChange={(top) => setV({ ...v, top: top || undefined })} />
        <ToggleRow icon="✅" label={v.kind === 'dream' ? t('wishCameTrue') : t('wishGot')} on={!!v.got} onChange={(got) => setV({ ...v, got: got || undefined })} />
      </Section>

      {v.createdBy === s.me && (
        <>
          <div className="section-header" style={{ padding: '0 32px 7px' }}>{t('wishWho')}</div>
          <div style={{ margin: '0 16px 16px' }}>
            <Segmented inSheet value={v.kind === 'dream' ? 'both' : v.owner} onChange={(owner) => setV({ ...v, owner, kind: owner === 'both' ? 'dream' : 'gift' })}
              options={[
                { value: s.me, label: `${s.users[s.me].emoji} ${s.users[s.me].name}` },
                { value: partner, label: `${s.users[partner].emoji} ${s.users[partner].name}` },
                { value: 'both', label: `✨ ${t('wishDreams')}` },
              ] as { value: Wish['owner']; label: string }[]} />
          </div>
        </>
      )}
      {!v.cover && <EmojiField value={v} onChange={setV} />}
      <VisibilityFields value={v} onChange={setV} allowPrivate />
      {!isNew && (
        <Section>
          <button className="row tap destructive" onClick={() => {
            update((st) => {
              st.wishes = st.wishes.filter((w) => w.id !== v.id)
              st.wishClaims = st.wishClaims.filter((c) => c.wishId !== v.id)
            })
            onClose()
          }}>{t('delete')}</button>
        </Section>
      )}
    </Sheet>
  )
}
