import { MercadoPagoConfig, Preference } from 'mercadopago';

// Instânciação do client Mercado Pago usando o SDK versão 2+
const client = new MercadoPagoConfig({
    accessToken: (process.env.MP_ACCESS_TOKEN || '').trim(),
    options: { timeout: 5000 }
});

export default async function handler(req, res) {
    // Configuração de CORS - Melhora a segurança permitindo apenas origens conhecidas se possível
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

        // Sanitização e Validação básica
        if (!items || !Array.isArray(items) || items.length === 0) {
            console.error('Tentativa de checkout com carrinho vazio ou inválido');
            return res.status(400).json({ error: 'O carrinho está vazio ou é inválido.' });
        }

        // Mapeamento rigoroso para evitar dados maliciosos
        const externalItems = items.map(item => ({
            id: String(item.id || '').substring(0, 50),
            title: String(item.name || 'Produto').substring(0, 256),
            currency_id: 'BRL',
            picture_url: item.image,
            description: String(item.description || '').substring(0, 256),
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit_price: Math.max(0.1, Number(item.price) || 0)
        }));

        const backUrl = origin || 'http://localhost:5173';
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: externalItems,
                payer: {
                    email: "cliente.teste@sandbox.mercadopago.com.br",
                    name: "Cliente Teste"
                },
                back_urls: {
                    success: backUrl,
                    failure: backUrl,
                    pending: backUrl
                },
                auto_return: 'approved',
                statement_descriptor: 'SKINCARE SHOP',
                notification_url: process.env.MP_WEBHOOK_URL || undefined,
                metadata: {
                    integration_agent: 'antigravity-ai-agent',
                    v2_migration: true,
                    checkout_timestamp: new Date().toISOString()
                }
            }
        });

        console.log(`Preferência criada com sucesso: ${result.id}`);
        return res.status(200).json({ id: result.id });
    } catch (error) {
        console.error('Critical Error in Mercado Pago Checkout:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });

        return res.status(500).json({
            error: 'Não foi possível processar o pagamento no momento.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
