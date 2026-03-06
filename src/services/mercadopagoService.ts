import type { CartItem } from '../types/product';

interface CheckoutData {
    items: CartItem[];
    total: number;
}

export const mercadopagoService = {
    createPreference: async (data: CheckoutData): Promise<string> => {
        console.log('Solicitando Preferência de Pagamento ao Backend local...', data);

        try {
            const response = await fetch('http://localhost:3000/api/create_preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Falha ao criar preferência');
            }

            const result = await response.json();
            return result.id;
        } catch (error) {
            console.error('Erro detalhado:', error);
            throw error;
        }
    }
};
