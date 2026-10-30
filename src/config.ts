// Public by design: the publishable key only grants what the database's row-level security allows.
// Leave empty to run in local demo mode (no login, data stays on the device).
export const SUPABASE_URL = ''
export const SUPABASE_KEY = ''

export const SYNC_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY)
