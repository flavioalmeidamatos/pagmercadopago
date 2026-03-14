import crypto from 'crypto';
import { Payment } from 'mercadopago';
import { getMercadoPagoAccessToken, getMercadoPagoWebhookSecret, getWebhookUrl } from './env.js';
import {
    createOrderRecord,
    getOrderById,
    markOrderAsFailed,
    syncOrderFromPayment,
    tryRegisterWebhookEvent,
    updateOrderAfterPaymentCreation,
    updateWebhookEvent
} from './supabase_admin.js';
import {
    extractWebhookSignatureInfo,
    getMPClient,
    isValidWebhookSignature,
    validateCheckoutPayload
} from './mp_common.js';

export async function createPixPayment({ req, payload }) {
    const { items, total, payerEmail } = validatePixPayload(payload);
    const orderId = crypto.randomUUID();
    const paymentClient = new Payment(getMPClient(getMercadoPagoAccessToken()));
    const notificationUrl = getWebhookUrl(req);
    const description = buildDescription(items);

    console.info('[PIX] Criando pedido pendente no Supabase', {
        orderId,
        itemsCount: items.length,
        total
    });

    await createOrderRecord({
        id: orderId,
        external_reference: orderId,
        order_status: 'pending',
        payment_method: 'pix',
        customer_email: payerEmail,
        description,
        transaction_amount: total,
        items
    });

    const { body } = buildPixPaymentBody({
        items,
        total,
        payerEmail,
        orderId,
        description,
        notificationUrl
    });

    console.info('[PIX] Enviando criação de pagamento ao Mercado Pago', {
        orderId,
        hasNotificationUrl: Boolean(notificationUrl)
    });

    let payment;
    try {
        payment = await paymentClient.create({ body });
    } catch (error) {
        await markOrderAsFailed(orderId, error instanceof Error ? error.message : 'Falha ao criar PIX no Mercado Pago');
        throw error;
    }

    const updatedOrder = await updateOrderAfterPaymentCreation(orderId, payment, notificationUrl);

    console.info('[PIX] Pagamento PIX criado', {
        orderId,
        paymentId: payment.id,
        status: payment.status
    });

    return toPixResponse(updatedOrder);
}

export async function getOrderStatus(orderId) {
    const order = await getOrderById(orderId);

    if (!order) {
        throw new Error('Pedido não encontrado.');
    }

    return toPixResponse(order);
}

export async function processMercadoPagoWebhook({ req }) {
    const signatureInfo = extractWebhookSignatureInfo({
        headers: req.headers,
        query: req.query,
        body: req.body
    });
    const topic = String(req.query.type || req.query.topic || req.body?.type || req.body?.topic || 'unknown');
    const action = String(req.body?.action || 'unknown');
    const notificationId = String(req.body?.id || req.query.id || '');
    const resourceId = String(req.query['data.id'] || req.body?.data?.id || signatureInfo?.dataId || '');
    const eventKey = buildWebhookEventKey({ notificationId, resourceId, topic, action });
    const webhookSecret = getMercadoPagoWebhookSecret();
    const signatureValid = signatureInfo ? isValidWebhookSignature(webhookSecret, signatureInfo) : false;

    console.info('[WEBHOOK] Entrada recebida', {
        topic,
        action,
        notificationId,
        resourceId,
        eventKey
    });

    const registration = await tryRegisterWebhookEvent({
        event_key: eventKey,
        mercadopago_notification_id: notificationId || null,
        mercadopago_resource_id: resourceId || null,
        mercadopago_topic: topic,
        action,
        request_id: req.headers['x-request-id'] || null,
        signature_valid: signatureValid,
        notification_payload: {
            query: req.query,
            body: req.body
        },
        processing_status: 'received'
    });

    if (registration.duplicate) {
        console.info('[WEBHOOK] Evento duplicado ignorado', {
            eventKey,
            existingStatus: registration.record?.processing_status || 'unknown'
        });
        return { httpStatus: 200, body: { ok: true, duplicate: true } };
    }

    if (!signatureInfo || !webhookSecret) {
        await updateWebhookEvent(registration.record.id, {
            processing_status: 'ignored',
            processing_error: 'Assinatura não pôde ser validada.',
            processed_at: new Date().toISOString()
        });
        console.warn('[WEBHOOK] Ignorado por falta de assinatura válida ou secret ausente', { eventKey });
        return { httpStatus: 202, body: { ok: false, ignored: true } };
    }

    if (!signatureValid) {
        await updateWebhookEvent(registration.record.id, {
            processing_status: 'ignored',
            processing_error: 'Assinatura inválida.',
            processed_at: new Date().toISOString()
        });
        console.warn('[WEBHOOK] Assinatura inválida', { eventKey });
        return { httpStatus: 202, body: { ok: false, ignored: true } };
    }

    if (topic !== 'payment') {
        await updateWebhookEvent(registration.record.id, {
            processing_status: 'ignored',
            processing_error: `Tópico ${topic} não é processado por este fluxo.`,
            processed_at: new Date().toISOString()
        });
        console.info('[WEBHOOK] Tópico ignorado', { topic, eventKey });
        return { httpStatus: 200, body: { ok: true, ignored: true } };
    }

    await updateWebhookEvent(registration.record.id, {
        processing_status: 'processing'
    });

    try {
        const payment = await fetchPaymentById(resourceId);
        console.info('[WEBHOOK] Pagamento confirmado na API Mercado Pago', {
            paymentId: payment.id,
            status: payment.status,
            externalReference: payment.external_reference
        });

        const order = await syncOrderFromPayment(payment);
        console.info('[WEBHOOK] Pedido atualizado no Supabase', {
            orderId: order.id,
            orderStatus: order.order_status,
            paymentId: order.mercadopago_payment_id
        });

        await updateWebhookEvent(registration.record.id, {
            processing_status: 'processed',
            order_id: order.id,
            processed_at: new Date().toISOString(),
            processing_error: null
        });

        return { httpStatus: 200, body: { ok: true } };
    } catch (error) {
        await updateWebhookEvent(registration.record.id, {
            processing_status: 'error',
            processing_error: error instanceof Error ? error.message : 'Erro desconhecido',
            processed_at: new Date().toISOString()
        });
        throw error;
    }
}

function validatePixPayload(payload) {
    const { items, total } = validateCheckoutPayload(payload);
    const payerEmail = String(payload?.payerEmail || '').trim().toLowerCase();

    if (!payerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
        throw new Error('E-mail do pagador inválido.');
    }

    return { items, total, payerEmail };
}

function buildPixPaymentBody({ items, total, payerEmail, orderId, description, notificationUrl }) {
    const expirationDate = new Date(Date.now() + (30 * 60 * 1000)).toISOString();

    return {
        body: {
            transaction_amount: total,
            description,
            payment_method_id: 'pix',
            external_reference: orderId,
            date_of_expiration: expirationDate,
            payer: {
                email: payerEmail
            },
            additional_info: {
                items: items.map((item) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    picture_url: item.picture_url,
                    category_id: item.category_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                }))
            },
            metadata: {
                order_id: orderId,
                payment_flow: 'pix_sandbox'
            },
            ...(notificationUrl ? { notification_url: notificationUrl } : {})
        }
    };
}

async function fetchPaymentById(paymentId) {
    if (!paymentId) {
        throw new Error('Webhook sem identificador de pagamento.');
    }

    const paymentClient = new Payment(getMPClient(getMercadoPagoAccessToken()));
    return paymentClient.get({ id: paymentId });
}

function buildDescription(items) {
    const titles = items.slice(0, 2).map((item) => item.title);
    return titles.join(', ').substring(0, 120) || 'Pedido PIX SKINCARE.CO';
}

function buildWebhookEventKey({ notificationId, resourceId, topic, action }) {
    return [topic || 'unknown', notificationId || 'none', resourceId || 'none', action || 'none'].join(':');
}

function toPixResponse(order) {
    return {
        orderId: order.id,
        paymentId: order.mercadopago_payment_id,
        status: order.order_status,
        paymentStatus: order.mercadopago_payment_status,
        statusDetail: order.mercadopago_status_detail,
        qrCode: order.qr_code,
        qrCodeBase64: order.mercadopago_payload?.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        ticketUrl: order.ticket_url,
        expiresAt: order.payment_expiration_at,
        amount: order.transaction_amount
    };
}
