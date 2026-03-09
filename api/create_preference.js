import { createMPPreference } from '../server/mp_common.js';

export default async function handler(req, res) {
    // Configuração de CORS
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { items } = req.body;

        const result = await createMPPreference(
            process.env.MP_ACCESS_TOKEN,
            items,
            origin || 'https://skincare-shop-mp.vercel.app', // Fallback URL for production
            process.env.MP_WEBHOOK_URL
        );

        console.log(`[Vercel] Preferência criada: ${result.id}`);
        return res.status(200).json({ id: result.id });
    } catch (error) {
        console.error('Critical Error in Checkout Handler:', {
            message: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            error: 'Não foi possível processar o pagamento no momento.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

