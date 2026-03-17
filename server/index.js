import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { createPreference, getMerchantOrder, getPayment } from './mercadopago.js';
import { getRequestBaseUrl, hasSupabaseAdminConfig } from './env.js';
import {
    buildOrderPayload,
    createPendingOrder,
    finalizeWebhookEvent,
    findOrderByLookup,
    storeWebhookEvent,
    updateOrderFromMerchantOrder,
    updateOrderFromPayment,
} from './orders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

function getNotificationUrl(req) {
    if (process.env.MP_WEBHOOK_URL) {
        return process.env.MP_WEBHOOK_URL;
    }

    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.headers.host;

    if (host) {
        const protocol = forwardedProto || (String(host).includes('localhost') ? 'http' : 'https');
        return `${protocol}://${host}/api/webhook`;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/api/webhook`;
    }

    return 'http://localhost:3000/api/webhook';
}

function buildBackUrl(baseUrl, status, externalReference) {
    const url = new URL(`/checkout/${status}`, baseUrl);
    url.searchParams.set('external_reference', externalReference);
    return url.toString();
}

function getWebhookInfo(req) {
    const body = req.body || {};
    const query = req.query || {};
    const topic = body.type || body.topic || query.type || query.topic || null;
    const action = body.action || query.action || null;
    const resourceId =
        body.data?.id
        || body.id
        || query.id
        || query['data.id']
        || body.resource?.split('/').pop()
        || null;

    return {
        topic,
        action,
        resourceId: resourceId ? String(resourceId) : null,
    };
}

app.post('/api/create_preference', async (req, res) => {
    try {
        const { items, payer } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Carrinho vazio.' });
        }

        if (!payer?.email?.trim()) {
            return res.status(400).json({ error: 'E-mail do comprador é obrigatório.' });
        }

        const baseUrl = getRequestBaseUrl(req, 'http://localhost:5173');
        const externalReference = `order-${Date.now()}-${randomUUID()}`;
        const backUrls = {
            success: buildBackUrl(baseUrl, 'success', externalReference),
            failure: buildBackUrl(baseUrl, 'failure', externalReference),
            pending: buildBackUrl(baseUrl, 'pending', externalReference),
        };

        const preference = await createPreference({
            items,
            payer,
            back_urls: backUrls,
            external_reference: externalReference,
            notification_url: getNotificationUrl(req),
        });

        if (hasSupabaseAdminConfig()) {
            await createPendingOrder(
                buildOrderPayload({
                    externalReference,
                    preferenceId: preference.id,
                    items,
                    payer,
                })
            );
        } else {
            console.warn('Supabase admin não configurado; checkout seguirá sem persistir o pedido.');
        }

        return res.json({
            init_point: preference.init_point,
            preference_id: preference.id,
            external_reference: externalReference,
        });
    } catch (error) {
        console.error('Erro ao criar preferência Mercado Pago:', error);
        const message = error instanceof Error ? error.message : 'Erro ao criar preferência de pagamento.';
        return res.status(500).json({ error: message });
    }
});

app.post('/api/webhook', async (req, res) => {
    const { topic, action, resourceId } = getWebhookInfo(req);
    let eventId = null;
    let orderExternalReference = null;

    try {
        eventId = await storeWebhookEvent({
            topic,
            action,
            resourceId,
            payload: {
                query: req.query,
                body: req.body,
            },
        });
    } catch (error) {
        console.error('Erro ao registrar webhook do Mercado Pago:', error);
    }

    try {
        if (!topic || !resourceId) {
            await finalizeWebhookEvent({
                eventId,
                orderExternalReference: null,
                processingError: 'Webhook ignorado por falta de topic ou resourceId.',
            });
            return res.status(202).json({ received: true, ignored: true });
        }

        if (topic === 'payment') {
            const payment = await getPayment(resourceId);
            orderExternalReference = payment.external_reference ?? null;
            await updateOrderFromPayment(payment);
        } else if (topic === 'merchant_order') {
            const merchantOrder = await getMerchantOrder(resourceId);
            orderExternalReference = merchantOrder.external_reference ?? null;
            await updateOrderFromMerchantOrder(merchantOrder);
        }

        await finalizeWebhookEvent({
            eventId,
            orderExternalReference,
            processingError: null,
        });

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro ao processar webhook do Mercado Pago:', error);

        try {
            await finalizeWebhookEvent({
                eventId,
                orderExternalReference,
                processingError: error instanceof Error ? error.message : 'Erro desconhecido',
            });
        } catch (finalizeError) {
            console.error('Erro ao finalizar registro do webhook:', finalizeError);
        }

        return res.status(500).json({ error: 'Erro ao processar webhook.' });
    }
});

app.get('/api/checkout_status', async (req, res) => {
    try {
        const order = await findOrderByLookup({
            externalReference: req.query.external_reference ? String(req.query.external_reference) : null,
            preferenceId: req.query.preference_id ? String(req.query.preference_id) : null,
            paymentId: req.query.payment_id ? Number(req.query.payment_id) : null,
            merchantOrderId: req.query.merchant_order_id ? Number(req.query.merchant_order_id) : null,
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        }

        return res.json({ order });
    } catch (error) {
        console.error('Erro ao consultar pedido:', error);
        return res.status(500).json({ error: 'Erro ao consultar status do pedido.' });
    }
});

// Servir arquivos estáticos do build do Vite
app.use(express.static(path.resolve(__dirname, '../dist')));

// Rota catch-all para SPA
app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
