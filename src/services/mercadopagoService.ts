import type { CartItem } from '../types/product';

interface PixCheckoutData {
    items: CartItem[];
    total: number;
    payerEmail: string;
}

export interface PixPaymentResponse {
    orderId: string;
    paymentId: string | number | null;
    status: string;
    paymentStatus: string;
    statusDetail: string | null;
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
    expiresAt: string | null;
    amount: number;
}

export const mercadopagoService = {
    createPixPayment: async (data: PixCheckoutData): Promise<PixPaymentResponse> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const apiUrl = import.meta.env.PROD
                ? '/api/create_preference'
                : 'http://localhost:3000/api/create_preference';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Erro ao processar checkout');
            }

            const result = await response.json();

            if (!result.orderId || !result.qrCode) {
                throw new Error('Dados do PIX não retornados pelo servidor');
            }

            return result as PixPaymentResponse;
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('A requisição do PIX demorou muito. Tente novamente.');
            }
            console.error('Erro ao chamar a API de PIX:', error);
            throw error;
        }
    },

    getOrderStatus: async (orderId: string): Promise<PixPaymentResponse> => {
        const apiUrl = import.meta.env.PROD
            ? `/api/order_status?orderId=${encodeURIComponent(orderId)}`
            : `http://localhost:3000/api/order_status?orderId=${encodeURIComponent(orderId)}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erro ao consultar pedido PIX');
        }

        return response.json();
    }
};
