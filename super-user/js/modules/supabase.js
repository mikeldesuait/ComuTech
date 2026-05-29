import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = "https://idbdkxhhqeuarcqcaweo.supabase.co"
const SUPABASE_KEY = "sb_publishable_uNWQl8gDfrmrPWS_1uEVcg_gMeqjO2U"

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
