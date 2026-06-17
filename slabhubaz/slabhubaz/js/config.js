// ============================================================
//  SlabHub AZ — Supabase Configuration
//  
//  1. Go to https://app.supabase.com
//  2. Create a new project (free tier)
//  3. Go to Project Settings → API
//  4. Copy your Project URL and anon public key
//  5. Replace the values below
// ============================================================

const SUPABASE_URL = 'https://ynyjrowaogmgzveeuzgs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NwnehUlgBrmrdlNxLlPR-w_vOS82son';

// Initialize the Supabase client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
