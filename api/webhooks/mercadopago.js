import { processMercadoPagoWebhook } from '../../server/pix_service.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const result = await processMercadoPagoWebhook({ req });
        return res.status(result.httpStatus).json(result.body);
    } catch (error) {
        console.error('❌ Erro no webhook:', error.message);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
