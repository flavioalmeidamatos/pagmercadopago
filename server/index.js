import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Verifica se o token existe antes de iniciar o client
if (!process.env.MP_ACCESS_TOKEN) {
    console.error("ERRO: MP_ACCESS_TOKEN não está definido no arquivo .env");
    process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

app.post('/api/create_preference', async (req, res) => {
    try {
        const { items } = req.body;

        // Validação e Sanitização local
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Carrinho vazio ou inválido' });
        }

        // Mapeamento rigoroso seguindo o padrão da API principal
        const externalItems = items.map(item => ({
            id: String(item.id || '').substring(0, 50),
            title: String(item.name || 'Produto').substring(0, 256),
            currency_id: 'BRL',
            picture_url: item.image,
            description: String(item.description || '').substring(0, 256),
            category_id: item.category,
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit_price: Math.max(0.1, Number(item.price) || 0)
        }));

        const preference = new Preference(client);

        // Origem dinâmica para redirecionamentos locais
        const origin = req.headers.origin || 'http://localhost:5173';

        const result = await preference.create({
            body: {
                items: externalItems,
                back_urls: {
                    success: origin,
                    failure: origin,
                    pending: origin
                },
                auto_return: 'approved',
                statement_descriptor: 'SKINCARE SHOP',
                metadata: {
                    integration_agent: 'antigravity-ai-local',
                    runtime: 'express-local-dev',
                    v2_migration: true
                }
            }
        });

        console.log(`[Local] Preferência Gerada: ${result.id}`);
        res.json({ id: result.id });
    } catch (error) {
        console.error('[Express] Erro ao criar preferência:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Erro local ao criar preferência de pagamento',
            details: error.message
        });
    }
});

// Rota para receber os Webhooks do Mercado Pago
app.post('/api/webhooks/mercadopago', (req, res) => {
    console.log("\n🔔 [WEBHOOK RECEBIDO] Evento disparado pelo Mercado Pago!");
    console.log("-> Query Params:", req.query);
    console.log("-> Body:", JSON.stringify(req.body, null, 2));

    // O Mercado Pago exige uma resposta rápida com status 200 OK
    // para confirmar que o webhook foi recebido, senão ele fica reenviando.
    res.status(200).send('Webhook recebido com sucesso');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
