import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, getSupabaseUrl } from './env.js';

let supabaseAdmin;

export function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }

    return supabaseAdmin;
}
