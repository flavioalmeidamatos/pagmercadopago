import { MercadoPagoConfig, Preference } from 'mercadopago';

// Instânciação do client Mercado Pago usando o SDK versão 2+
const client = new MercadoPagoConfig({
    accessToken: (process.env.MP_ACCESS_TOKEN || '').trim(),
    options: { timeout: 5000 }
});

export default async function handler(req, res) {
    // Configuração de CORS para permitir a requisição do frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { items, total } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Nenhum item adicionado' });
        }

        const externalItems = items.map(item => ({
            id: String(item.id),
            title: item.name,
            currency_id: 'BRL',
            picture_url: item.image,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.price)
        }));

        const origin = req.headers.origin || `https://${req.headers.host}` || 'http://localhost:5173';

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: externalItems,
                back_urls: {
                    success: origin,
                    failure: origin,
                    pending: origin
                },
                auto_return: 'approved',
                metadata: {
                    integration_agent: 'antigravity-ai',
                    platform: 'vercel-serverless',
                    version: '2.0.0'
                }
            }
        });

        res.status(200).json({ id: result.id });
    } catch (error) {
        console.error('Erro na criação de preferência do Mercado Pago:', error);
        res.status(500).json({ error: 'Falha ao processar o pagamento.' });
    }
}
