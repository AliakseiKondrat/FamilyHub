import { SUPABASE_URL } from '../config'

export const API_BASE = `${SUPABASE_URL}/functions/v1/api`

/** Scriptable widget: today's tasks, the next events and the shopping count, in the app's colors. */
export function widgetScript(key: string, noTasks: string) {
  return `// Family Hub widget for Scriptable
const KEY = "${key}"
const URL_ = "${API_BASE}/summary?key=" + KEY
const APP = "https://aliakseikondrat.github.io/FamilyHub/"

const data = await new Request(URL_).loadJSON()
const w = new ListWidget()
const g = new LinearGradient()
g.colors = [new Color("#4338ca"), new Color("#a855f7")]
g.locations = [0, 1]
w.backgroundGradient = g
w.url = APP
w.setPadding(14, 14, 14, 14)
const size = config.widgetFamily || "medium"

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
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium()
Script.complete()
`
}
