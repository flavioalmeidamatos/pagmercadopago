import { getOrderStatus } from '../server/pix_service.js';

export default async function handler(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const orderId = String(req.query.orderId || '').trim();
        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório.' });
        }

        const result = await getOrderStatus(orderId);
        return res.status(200).json(result);
    } catch (error) {
        const statusCode = error.message?.includes('não encontrado') ? 404 : 500;
        console.error('[PIX] Erro ao consultar pedido:', {
            message: error.message,
            stack: error.stack
        });
        return res.status(statusCode).json({
            error: statusCode === 404 ? error.message : 'Não foi possível consultar o pedido.'
        });
    }
}
