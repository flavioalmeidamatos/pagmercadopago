import { createClient } from '@supabase/supabase-js';

/**
 * Configuração central do Supabase
 * Utiliza variáveis de ambiente seguras (VITE_ prefix para o frontend)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase URL ou Key não encontradas no .env. Algumas funcionalidades podem não funcionar.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipagem básica para nossas tabelas (seguindo a regra de Português Brasil)
export interface Pedido {
    id: string;
    mp_preferencia_id: string;
    status: 'pendente' | 'aprovado' | 'cancelado';
    valor_total: number;
    cliente_email: string;
    items: any[];
    criado_em: string;
}
