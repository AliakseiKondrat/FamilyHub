import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL, SYNC_ENABLED } from '../config'

export const supabase = SYNC_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
