import { MercadoPagoConfig, MerchantOrder, Payment, Preference } from 'mercadopago';
import { getMercadoPagoAccessToken } from './env.js';

let mpConfig;

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

    const body = {
        items: items.map((item) => ({
            id: item.id,
            title: item.name,
            description: item.description || item.name,
            picture_url: item.image,
            category_id: item.category || 'others',
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
        back_urls,
        auto_return: 'approved',
        binary_mode: false,
        external_reference,
        notification_url,
    };

    console.log('Mercado Pago preference request body:', JSON.stringify(body, null, 2));

    const response = await preferenceClient.create({ body });
    return response;
}

export async function getPayment(paymentId) {
    const paymentClient = new Payment(getMercadoPagoClient());
    return paymentClient.get({ id: Number(paymentId) });
}

export async function getMerchantOrder(merchantOrderId) {
    const merchantOrderClient = new MerchantOrder(getMercadoPagoClient());
    return merchantOrderClient.get({ merchantOrderId: Number(merchantOrderId) });
}
