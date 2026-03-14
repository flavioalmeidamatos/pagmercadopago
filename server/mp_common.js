import { MercadoPagoConfig, Preference } from 'mercadopago';
import crypto from 'crypto';

/**
 * Common configuration and items mapping for Mercado Pago
 * This ensures that both the Express server and Vercel functions use the same logic.
 */

export function getMPClient(accessToken) {
    if (!accessToken || accessToken.trim() === '') {
        throw new Error('MP_ACCESS_TOKEN is not defined');
    }
    return new MercadoPagoConfig({
        accessToken: accessToken.trim(),
        options: { timeout: 10000 }
    });
}

export function normalizeBaseUrl(urlValue, fallbackUrl) {
    const candidate = (urlValue || fallbackUrl || '').trim();

    if (!candidate) {
        throw new Error('URL base não configurada para o checkout.');
    }

    let parsed;

    try {
        parsed = new URL(candidate);
    } catch {
        throw new Error('URL base do checkout é inválida.');
    }

    return parsed.origin;
}

export function resolveNotificationUrl(notificationUrl, baseUrl) {
    const candidate = (notificationUrl || '').trim();

    if (!candidate) {
        return null;
    }

    try {
        return new URL(candidate).toString();
    } catch {
        return new URL(candidate, `${normalizeBaseUrl(baseUrl, baseUrl)}/`).toString();
    }
}

export function mapCartItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('O carrinho está vazio ou é inválido.');
    }

    return items.map(item => ({
        id: String(item.id || '').substring(0, 50),
        title: String(item.name || 'Produto').substring(0, 256),
        currency_id: 'BRL',
        picture_url: item.image,
        description: String(item.description || '').substring(0, 256),
        category_id: item.category, // Added category_id (consistent with server/index.js)
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit_price: Math.max(0.1, Number(item.price) || 0)
    }));
}

export function validateCheckoutPayload(payload) {
    const items = payload?.items;
    const total = Number(payload?.total);

    const mappedItems = mapCartItems(items);
    const calculatedTotal = mappedItems.reduce((sum, item) => (
        sum + (item.unit_price * item.quantity)
    ), 0);

    if (!Number.isFinite(total) || total <= 0) {
        throw new Error('Total do checkout inválido.');
    }

    if (Math.abs(calculatedTotal - total) > 0.01) {
        throw new Error('Total do checkout divergente dos itens.');
    }

    return {
        items: mappedItems,
        total: calculatedTotal
    };
}

export function extractWebhookSignatureInfo({ headers, query, body }) {
    const signatureHeader = headers['x-signature'];
    const requestId = headers['x-request-id'];

    if (!signatureHeader || !requestId) {
        return null;
    }

    const segments = String(signatureHeader)
        .split(',')
        .map((part) => part.trim().split('='))
        .filter(([key, value]) => key && value);

    const ts = segments.find(([key]) => key === 't')?.[1];
    const hash = segments.find(([key]) => key === 'v1')?.[1];
    const rawDataId = query?.['data.id'] || query?.id || body?.data?.id || body?.id;

    if (!ts || !hash || !rawDataId) {
        return null;
    }

    const dataId = String(rawDataId).toLowerCase();
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

    return { hash, manifest, dataId };
}

export function isValidWebhookSignature(secret, signatureInfo) {
    if (!secret || !signatureInfo) {
        return false;
    }

    const expected = Buffer.from(signatureInfo.hash, 'hex');
    const calculated = Buffer.from(
        createHmacSignature(secret, signatureInfo.manifest),
        'hex'
    );

    if (expected.length !== calculated.length) {
        return false;
    }

    return expected.length > 0 && crypto.timingSafeEqual(expected, calculated);
}

function createHmacSignature(secret, manifest) {
    return crypto.createHmac('sha256', secret)
        .update(manifest)
        .digest('hex');
}

export async function createMPPreference(accessToken, items, backUrl, notificationUrl = null) {
    const client = getMPClient(accessToken);
    const checkoutBaseUrl = normalizeBaseUrl(backUrl, 'http://localhost:5173');
    const preference = new Preference(client);

    const body = {
        items,
        back_urls: {
            success: checkoutBaseUrl,
            failure: checkoutBaseUrl,
            pending: checkoutBaseUrl
        },
        auto_return: "approved",
        statement_descriptor: 'SKINCARE SHOP',
        metadata: {
            integration_agent: 'antigravity-ai-refactored',
            runtime: process.env.VERCEL ? 'serverless-vercel' : 'express-node',
            v2_migration: true,
            checkout_timestamp: new Date().toISOString(),
            items_count: items.length
        }
    };

    const resolvedNotificationUrl = resolveNotificationUrl(notificationUrl, checkoutBaseUrl);
    if (resolvedNotificationUrl) {
        body.notification_url = resolvedNotificationUrl;
    }

    return await preference.create({ body });
}
