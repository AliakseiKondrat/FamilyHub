import { useState } from 'react'
import { base, update, useApp, visible } from '../store'
import { moduleLabel, useT } from '../i18n'
import { Empty, GlassButton, Marks, Row, Screen, Section, Sheet, Swipe, TextRow, ToggleRow, VisibilityFields, toast } from '../ui'
import { guessCategory } from '../lib/categories'
import type { Recipe } from '../types'

export default function Recipes() {
  const s = useApp()
  const t = useT()
  const [tag, setTag] = useState<string | null>(null)
  const [edit, setEdit] = useState<Recipe | null>(null)
  const all = visible(s.recipes, s.me)
  const tags = [...new Set(all.flatMap((r) => r.tags))].sort()
  const list = all.filter((r) => (tag === '__someday' ? r.someday : !tag || r.tags.includes(tag)))
  const regular = list.filter((r) => !r.someday || tag === '__someday')
  const someday = tag === '__someday' ? [] : list.filter((r) => r.someday)

  const row = (r: Recipe) => (
    <Swipe key={r.id} onDelete={() => update((st) => { st.recipes = st.recipes.filter((x) => x.id !== r.id) })}>
      <Row icon={r.someday ? '🕸️' : '🍳'} title={<>{r.title} <Marks x={r} /></>} chevron onClick={() => setEdit(r)}
        sub={<>{r.tags.map((x) => <span key={x} className="tag">{x}</span>)}{r.cooked > 0 && <span>{t('cooked', { n: r.cooked })}</span>}{r.url && <span>🔗</span>}</>} />
    </Swipe>
  )

  return (
    <Screen title={moduleLabel(s, 'recipes').title} back accent="recipes"
      right={<GlassButton icon="plus" label={t('add')} onClick={() => setEdit({ ...base(s.me), title: '', tags: [], ingredients: [], someday: false, cooked: 0 })} />}
      head={<div className="chips" style={{ paddingTop: 0 }}>
        <button className={'chip' + (!tag ? ' on' : '')} onClick={() => setTag(null)}>{t('all')}</button>
        <button className={'chip' + (tag === '__someday' ? ' on' : '')} onClick={() => setTag('__someday')}>🕸️ {t('someday')}</button>
        {tags.map((x) => <button key={x} className={'chip' + (tag === x ? ' on' : '')} onClick={() => setTag(x)}>#{x}</button>)}
      </div>}>
      {list.length === 0 && <Empty emoji="🍳" text={t('empty')} />}
      {regular.length > 0 && <Section>{regular.map(row)}</Section>}
      {someday.length > 0 && <Section big header={`🕸️ ${t('someday')}`}>{someday.map(row)}</Section>}
      {edit && <RecipeEditor recipe={edit} onClose={() => setEdit(null)} />}
    </Screen>
  )
}

function RecipeEditor({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const s = useApp()
  const t = useT()
  const [v, setV] = useState(recipe)
  const [ingredients, setIngredients] = useState(recipe.ingredients.join('\n'))
  const [tags, setTags] = useState(recipe.tags.join(', '))
  const isNew = !s.recipes.some((r) => r.id === recipe.id)
  const collect = (): Recipe => ({
    ...v,
    ingredients: ingredients.split('\n').map((x) => x.trim()).filter(Boolean),
    tags: tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
  })
  const save = () => update((st) => {
    const x = collect()
    if (isNew) st.recipes.unshift(x)
    else st.recipes = st.recipes.map((r) => (r.id === x.id ? x : r))
  })
  const toGroceries = () => {
    update((st) => {
      for (const title of collect().ingredients) {
        if (st.groceries.some((g) => !g.done && g.title.toLowerCase() === title.toLowerCase())) continue
        st.groceries.unshift({ ...base(st.me), title, category: guessCategory(title), done: false })
      }
    })
    toast(t('addedToGroceries'))
  }
  return (
    <Sheet title={isNew ? t('add') : v.title} onClose={onClose} onDone={save} doneDisabled={!v.title.trim()}>
      <Section>
        <TextRow value={v.title} onChange={(title) => setV({ ...v, title })} placeholder={t('title')} autoFocus={isNew} />
        <TextRow value={v.url ?? ''} onChange={(url) => setV({ ...v, url })} placeholder={`🔗 ${t('link')}`} />
        <TextRow value={tags} onChange={setTags} placeholder={`# ${t('tags')}`} />
      </Section>
      <Section><ToggleRow icon="🕸️" label={t('someday')} on={v.someday} onChange={(someday) => setV({ ...v, someday })} /></Section>
      <Section header={t('ingredients')} footer={t('ingredientsHint')}>
        <div className="row"><textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={t('ingredients')} /></div>
      </Section>
      <Section>
        <button className="row tap accent" disabled={!ingredients.trim()} onClick={toGroceries}>🛒 {t('toGroceries')}</button>
        <button className="row tap accent" onClick={() => setV({ ...v, cooked: v.cooked + 1, someday: false })}>
          👩‍🍳 {t('markCooked')} {v.cooked > 0 && <span style={{ color: 'var(--label2)', marginLeft: 'auto' }}>{t('cooked', { n: v.cooked })}</span>}
        </button>
        {v.url && <a className="row tap accent" href={v.url} target="_blank" rel="noreferrer">🔗 {t('open_link')}</a>}
      </Section>
      <Section>
        <TextRow value={v.notes ?? ''} onChange={(notes) => setV({ ...v, notes })} placeholder={t('notes')} multiline />
      </Section>
      <VisibilityFields value={v} onChange={setV} />
    </Sheet>
  )
}
