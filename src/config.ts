// Public by design: the publishable key only grants what the database's row-level security allows.
// Leave empty to run in local demo mode (no login, data stays on the device).
export const SUPABASE_URL = 'https://bczhzciusnpjtxlznrse.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_oa23DrXrlZjsKPt2cxuElA_f-92w_vN'

/** `?demo` in the URL runs the app on local demo data without an account (separate storage). */
export const DEMO = new URLSearchParams(location.search).has('demo')
export const SYNC_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY) && !DEMO
