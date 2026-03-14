import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

/**
 * Configuração central do Supabase
 * Aceita VITE_ e NEXT_PUBLIC_ para manter compatibilidade com Vite e Vercel.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY
    || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase URL ou Key não encontradas no .env. Algumas funcionalidades podem não funcionar.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Tipagem básica para nossas tabelas (seguindo a regra de Português Brasil)
export type Pedido = Database['public']['Tables']['orders']['Row'];
