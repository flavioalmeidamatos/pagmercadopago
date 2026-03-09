import { MercadoPagoConfig, Preference } from 'mercadopago';

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

export async function createMPPreference(accessToken, items, backUrl, notificationUrl = null) {
    const client = getMPClient(accessToken);
    const externalItems = mapCartItems(items);
    const preference = new Preference(client);

    const body = {
        items: externalItems,
        payer: {
            email: "test_user_196537335@testuser.com", // Keeping test_user as in previous code
            identification: {
                type: "CPF",
                number: "19100000000"
            }
        },
        back_urls: {
            success: backUrl,
            failure: backUrl,
            pending: backUrl
        },
        auto_return: "approved",
        statement_descriptor: 'SKINCARE SHOP',
        metadata: {
            integration_agent: 'antigravity-ai-refactored',
            runtime: process.env.VERCEL ? 'serverless-vercel' : 'express-node',
            v2_migration: true,
            checkout_timestamp: new Date().toISOString()
        }
    };

    if (notificationUrl) {
        body.notification_url = notificationUrl;
    }

    return await preference.create({ body });
}
