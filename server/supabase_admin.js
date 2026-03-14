import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, getSupabaseUrl } from './env.js';

let supabaseAdmin;

function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }

    return supabaseAdmin;
}

function toOrderSnapshot(payment) {
    const externalReference = payment.external_reference || payment.metadata?.order_id;
    return {
        external_reference: externalReference,
        mercadopago_payment_id: payment.id ?? null,
        mercadopago_payment_status: payment.status || 'pending',
        mercadopago_status_detail: payment.status_detail || null,
        order_status: mapOrderStatus(payment.status),
        payment_method: payment.payment_method_id || 'pix',
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code || null,
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url || null,
        mercadopago_payload: payment,
        payment_approved_at: payment.date_approved || null,
        payment_expiration_at: payment.date_of_expiration || null,
        last_webhook_at: new Date().toISOString()
    };
}

export async function createOrderRecord(orderInput) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('orders')
        .insert(orderInput)
        .select()
        .single();

    if (error) {
        throw new Error(`Falha ao criar pedido no Supabase: ${error.message}`);
    }

    return data;
}

export async function updateOrderAfterPaymentCreation(orderId, payment, notificationUrl) {
    const supabase = getSupabaseAdmin();
    const updatePayload = {
        ...toOrderSnapshot(payment),
        notification_url: notificationUrl || null
    };

    const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single();

    if (error) {
        throw new Error(`Falha ao atualizar pedido com PIX criado: ${error.message}`);
    }

    return data;
}

export async function markOrderAsFailed(orderId, reason) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('orders')
        .update({
            order_status: 'failed',
            mercadopago_status_detail: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

    if (error) {
        throw new Error(`Falha ao marcar pedido como failed: ${error.message}`);
    }

    return data;
}

export async function getOrderById(orderId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

    if (error) {
        throw new Error(`Falha ao consultar pedido no Supabase: ${error.message}`);
    }

    return data;
}

export async function syncOrderFromPayment(payment) {
    const supabase = getSupabaseAdmin();
    const orderUpdate = toOrderSnapshot(payment);
    if (!orderUpdate.external_reference && !payment.id) {
        throw new Error('Pagamento sem external_reference e sem id para conciliação.');
    }

    let data = null;
    let error = null;

    if (orderUpdate.external_reference) {
        ({ data, error } = await supabase
            .from('orders')
            .update(orderUpdate)
            .eq('external_reference', orderUpdate.external_reference)
            .select()
            .maybeSingle());
    }

    if (!data && payment.id) {
        ({ data, error } = await supabase
            .from('orders')
            .update(orderUpdate)
            .eq('mercadopago_payment_id', payment.id)
            .select()
            .maybeSingle());
    }

    if (error) {
        throw new Error(`Falha ao sincronizar pedido com pagamento Mercado Pago: ${error.message}`);
    }

    if (!data) {
        throw new Error('Pedido correspondente ao pagamento não foi encontrado no Supabase.');
    }

    return data;
}

export async function tryRegisterWebhookEvent(eventInput) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('payment_webhook_events')
        .insert(eventInput)
        .select()
        .single();

    if (!error) {
        return { duplicate: false, record: data };
    }

    if (error.code === '23505') {
        const existing = await getWebhookEventByKey(eventInput.event_key);
        return { duplicate: true, record: existing };
    }

    throw new Error(`Falha ao registrar evento de webhook: ${error.message}`);
}

export async function updateWebhookEvent(eventId, patch) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('payment_webhook_events')
        .update(patch)
        .eq('id', eventId)
        .select()
        .single();

    if (error) {
        throw new Error(`Falha ao atualizar evento de webhook: ${error.message}`);
    }

    return data;
}

async function getWebhookEventByKey(eventKey) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('payment_webhook_events')
        .select('*')
        .eq('event_key', eventKey)
        .maybeSingle();

    if (error) {
        throw new Error(`Falha ao consultar evento duplicado: ${error.message}`);
    }

    return data;
}

function mapOrderStatus(paymentStatus) {
    switch (paymentStatus) {
        case 'approved':
            return 'approved';
        case 'cancelled':
        case 'rejected':
        case 'refunded':
        case 'charged_back':
            return 'cancelled';
        case 'expired':
            return 'expired';
        case 'in_process':
        case 'pending':
        case 'authorized':
        default:
            return 'pending';
    }
}
