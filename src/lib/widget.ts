import { SUPABASE_URL } from '../config'

export const API_BASE = `${SUPABASE_URL}/functions/v1/api`

/**
 * Scriptable widget, three kinds chosen by the widget's Parameter: empty — today's tasks, events and groceries;
 * «мысль» / «thought» — a warm thought of the day (the partner's latest note, else a daily phrase);
 * «поездка» / «trip» — days until the next trip and the money saved for it.
 */
export function widgetScript(key: string, noTasks: string) {
  return `// Family Hub widget for Scriptable. Parameter: empty = today, «мысль» = thought of the day, «поездка» = next trip
const KEY = "${key}"
const URL_ = "${API_BASE}/summary?key=" + KEY
const APP = "https://aliakseikondrat.github.io/FamilyHub/"
const param = String(args.widgetParameter || "").toLowerCase()
const kind = /мысл|thought|mysl/.test(param) ? "thought" : /поезд|trip|travel|podr/.test(param) ? "trip" : "today"

const data = await new Request(URL_).loadJSON()
const w = new ListWidget()
const g = new LinearGradient()
g.colors = kind === "thought" ? [new Color("#db2777"), new Color("#f59e0b")] : kind === "trip" ? [new Color("#0ea5e9"), new Color("#6366f1")] : [new Color("#4338ca"), new Color("#a855f7")]
g.locations = [0, 1]
w.backgroundGradient = g
w.url = APP
w.setPadding(14, 14, 14, 14)
const size = config.widgetFamily || "medium"
const text = (s, f, a) => { const x = w.addText(s); x.font = f; x.textColor = new Color("#ffffff", a || 1); return x }

if (kind === "thought") {
  text("💗 Мысль дня", Font.semiboldSystemFont(13), 0.85)
  w.addSpacer()
  const t = text(data.thought.text, Font.boldSystemFont(size === "small" ? 15 : 18))
  t.minimumScaleFactor = 0.6
  if (data.thought.from) { w.addSpacer(4); text("— " + data.thought.from, Font.systemFont(12), 0.85) }
  w.addSpacer()
} else if (kind === "trip") {
  const tr = data.trip
  if (!tr) { text("✈️ Поездок пока нет", Font.boldSystemFont(16)); text("Добавь её в «Путешествия»", Font.systemFont(12), 0.85) }
  else {
    text("✈️ " + tr.title, Font.semiboldSystemFont(14), 0.9).lineLimit = 1
    w.addSpacer()
    const big = tr.days > 0 ? String(tr.days) : tr.days === 0 ? "Сегодня!" : "В пути"
    text(big, Font.boldSystemFont(tr.days > 0 ? 40 : 26))
    if (tr.days > 0) text(tr.days % 10 === 1 && tr.days % 100 !== 11 ? "день до отъезда" : [2, 3, 4].includes(tr.days % 10) && ![12, 13, 14].includes(tr.days % 100) ? "дня до отъезда" : "дней до отъезда", Font.systemFont(12), 0.85)
    w.addSpacer()
    if (tr.saved || tr.target) {
      const fmt = (n) => Math.round(n).toLocaleString("ru-RU")
      text("💰 " + fmt(tr.saved || 0) + (tr.target ? " / " + fmt(tr.target) : "") + " " + (tr.currency === "EUR" ? "€" : "zł"), Font.semiboldSystemFont(13))
      if (tr.target) {
        const bar = w.addStack(); bar.size = new Size(size === "small" ? 120 : 280, 6); bar.cornerRadius = 3; bar.backgroundColor = new Color("#ffffff", 0.25)
        const fill = bar.addStack(); fill.size = new Size(Math.max(4, Math.min(1, (tr.saved || 0) / tr.target) * (size === "small" ? 120 : 280)), 6); fill.cornerRadius = 3; fill.backgroundColor = Color.white()
        bar.addSpacer()
      }
    }
  }
} else {
  const head = w.addStack()
  const t = head.addText("Family Hub")
  t.font = Font.boldSystemFont(15); t.textColor = Color.white()
  head.addSpacer()
  const c = head.addText("🛒 " + data.counts.groceries)
  c.font = Font.semiboldSystemFont(13); c.textColor = new Color("#ffffff", 0.85)
  w.addSpacer(8)
  const line = (s, bold) => { const x = w.addText(s); x.font = bold ? Font.semiboldSystemFont(13) : Font.systemFont(13); x.textColor = Color.white(); x.lineLimit = 1 }
  const max = size === "small" ? 3 : size === "large" ? 8 : 4
  if (data.tasks.length) {
    for (const k of data.tasks.slice(0, max)) line((k.overdue ? "⚠︎ " : "○ ") + (k.time ? k.time + " " : "") + k.title)
  } else line("✓ ${noTasks.replace(/"/g, '')}", true)
  if (size !== "small" && data.events.length) {
    w.addSpacer(6)
    for (const e of data.events.slice(0, size === "large" ? 4 : 2)) line("📅 " + (e.date === data.today ? "" : e.date.slice(8) + "." + e.date.slice(5, 7) + " ") + (e.time ? e.time + " " : "") + e.title)
  }
  w.addSpacer()
}
w.refreshAfterDate = new Date(Date.now() + (kind === "today" ? 15 : 60) * 60 * 1000)
if (config.runsInWidget) Script.setWidget(w); else await (kind === "today" ? w.presentMedium() : w.presentSmall())
Script.complete()
`
}
