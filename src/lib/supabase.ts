import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

// Client for authenticated users (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend processes that bypass RLS (e.g. telephony webhook)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
