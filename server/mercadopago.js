import { MercadoPagoConfig, MerchantOrder, Payment, Preference } from 'mercadopago';
import { getMercadoPagoAccessToken } from './env.js';

let mpConfig;

const CATEGORY_MAP = {
    limpeza: 'health_beauty',
    hidratacao: 'health_beauty',
    hidratação: 'health_beauty',
    tratamento: 'health_beauty',
};

function normalizeCategory(category) {
    if (!category) {
        return 'health_beauty';
    }

    return CATEGORY_MAP[String(category).trim().toLowerCase()] || 'health_beauty';
}

function normalizePictureUrl(image) {
    if (typeof image !== 'string') {
        return undefined;
    }

    const normalized = image.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        return undefined;
    }

    return normalized;
}

function extractMercadoPagoError(error) {
    const message =
        error?.message
        || error?.cause?.message
        || error?.cause?.[0]?.message
        || 'Erro desconhecido ao criar preferência no Mercado Pago.';

    const details = error?.cause?.[0]?.description
        || error?.cause?.description
        || error?.response?.data
        || null;

    return {
        message,
        details,
    };
}

function getMercadoPagoClient() {
    if (!mpConfig) {
        mpConfig = new MercadoPagoConfig({
            accessToken: getMercadoPagoAccessToken(),
        });
    }

    return mpConfig;
}

export async function createPreference({ items, payer, back_urls, external_reference, notification_url }) {
    const preferenceClient = new Preference(getMercadoPagoClient());
    const sanitizedBackUrls = Object.fromEntries(
        Object.entries(back_urls || {}).filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    );
    const body = {
        items: items.map((item) => ({
            id: item.id,
            title: item.name,
            description: item.description || item.name,
            picture_url: normalizePictureUrl(item.image),
            category_id: normalizeCategory(item.category),
            quantity: item.quantity,
            currency_id: 'BRL',
            unit_price: item.price,
        })),
        payer: {
            email: payer?.email ?? 'test@example.com',
            name: payer?.name ?? 'Cliente',
            surname: payer?.surname ?? 'Teste',
            phone: payer?.phone,
            identification: payer?.identification,
            address: payer?.address,
        },
        back_urls: sanitizedBackUrls,
        binary_mode: false,
        external_reference,
        notification_url,
    };

    if (sanitizedBackUrls.success) {
        body.auto_return = 'approved';
    }

    console.log('Mercado Pago preference request body:', JSON.stringify(body, null, 2));
    try {
        const response = await preferenceClient.create({ body });
        return response;
    } catch (error) {
        const mercadoPagoError = extractMercadoPagoError(error);
        console.error('Erro detalhado ao criar preferência no Mercado Pago:', mercadoPagoError);
        throw new Error(
            mercadoPagoError.details
                ? `${mercadoPagoError.message} ${JSON.stringify(mercadoPagoError.details)}`
                : mercadoPagoError.message
        );
    }
}

export async function getPayment(paymentId) {
    const paymentClient = new Payment(getMercadoPagoClient());
    return paymentClient.get({ id: Number(paymentId) });
}

export async function getMerchantOrder(merchantOrderId) {
    const merchantOrderClient = new MerchantOrder(getMercadoPagoClient());
    return merchantOrderClient.get({ merchantOrderId: Number(merchantOrderId) });
}
