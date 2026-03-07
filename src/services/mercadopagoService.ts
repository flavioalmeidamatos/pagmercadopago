import type { CartItem } from '../types/product';

interface CheckoutData {
    items: CartItem[];
    total: number;
}

export const mercadopagoService = {
    createPreference: async (data: CheckoutData): Promise<string> => {
        console.log('Solicitando Preferência de Pagamento ao Backend local...', data);

        try {
            // Usa o endpoint /api/create_preference para suportar serverless na Vercel
            const apiUrl = import.meta.env.PROD
                ? '/api/create_preference'
                : 'http://localhost:3000/api/create_preference'; // Mantém compatibilidade local com dev:backend

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Falha ao criar preferência do Mercado Pago');
            }

            const result = await response.json();
            return result.id;
        } catch (error) {
            console.error('Erro ao chamar o checkout na API:', error);
            throw error;
        }
    }
};
