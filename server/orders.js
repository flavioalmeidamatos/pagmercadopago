import { getSupabaseAdmin } from './supabase_admin.js';

function mapPaymentStatusToOrderStatus(status) {
    switch (status) {
        case 'approved':
            return 'approved';
        case 'refunded':
        case 'partially_refunded':
            return 'refunded';
        case 'cancelled':
            return 'cancelled';
        case 'rejected':
        case 'charged_back':
            return 'failed';
        case 'expired':
            return 'expired';
        default:
            return 'pending';
    }
}

function mapMerchantOrderToOrderStatus(merchantOrder) {
    if (merchantOrder.cancelled) {
        return 'cancelled';
    }

    if ((merchantOrder.refunded_amount || 0) > 0 && (merchantOrder.paid_amount || 0) <= (merchantOrder.refunded_amount || 0)) {
        return 'refunded';
    }

    if ((merchantOrder.paid_amount || 0) >= (merchantOrder.total_amount || 0) && (merchantOrder.total_amount || 0) > 0) {
        return 'approved';
    }

    if (merchantOrder.order_status === 'expired') {
        return 'expired';
    }

    return 'pending';
}

function buildDescription(items) {
    return items
        .map((item) => `${item.quantity}x ${item.name}`)
        .join(', ')
        .slice(0, 500);
}

function calculateTransactionAmount(items) {
    return Number(
        items.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0).toFixed(2)
    );
}

export function buildOrderPayload({ externalReference, preferenceId, items, payer }) {
    return {
        external_reference: externalReference,
        preference_id: preferenceId,
        order_status: 'pending',
        payment_status: 'pending',
        customer_email: payer?.email?.trim() || 'test@example.com',
        description: buildDescription(items),
        transaction_amount: calculateTransactionAmount(items),
        items,
    };
}

export async function createPendingOrder(orderPayload) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function findOrderByReference(externalReference) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('external_reference', externalReference)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

export async function findOrderByLookup({ externalReference, preferenceId, paymentId, merchantOrderId }) {
    const supabase = getSupabaseAdmin();

    if (externalReference) {
        return findOrderByReference(externalReference);
    }

    if (preferenceId) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('preference_id', preferenceId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    if (paymentId) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('payment_id', paymentId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    if (merchantOrderId) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('merchant_order_id', merchantOrderId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    return null;
}

export async function storeWebhookEvent({ topic, action, resourceId, payload }) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('webhook_events')
        .insert({
            topic: topic || 'unknown',
            action: action || null,
            resource_id: resourceId || null,
            payload,
        })
        .select('id')
        .single();

    if (error) {
        throw error;
    }

    return data?.id ?? null;
}

export async function finalizeWebhookEvent({ eventId, orderExternalReference, processingError }) {
    if (!eventId) {
        return;
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('webhook_events')
        .update({
            order_external_reference: orderExternalReference || null,
            processed_at: new Date().toISOString(),
            processing_error: processingError || null,
        })
        .eq('id', eventId);

    if (error) {
        throw error;
    }
}

export async function updateOrderFromPayment(payment) {
    if (!payment?.external_reference) {
        return null;
    }

    const supabase = getSupabaseAdmin();
    const payload = {
        payment_id: payment.id ?? null,
        merchant_order_id: payment.order?.id ?? null,
        order_status: mapPaymentStatusToOrderStatus(payment.status),
        payment_status: payment.status ?? null,
        payment_status_detail: payment.status_detail ?? null,
        last_webhook_event_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('external_reference', payment.external_reference)
        .select('*')
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

export async function updateOrderFromMerchantOrder(merchantOrder) {
    if (!merchantOrder?.external_reference) {
        return null;
    }

    const lastPayment = [...(merchantOrder.payments || [])]
        .sort((left, right) => (right.id || 0) - (left.id || 0))[0];

    const supabase = getSupabaseAdmin();
    const payload = {
        preference_id: merchantOrder.preference_id ?? null,
        merchant_order_id: merchantOrder.id ?? null,
        payment_id: lastPayment?.id ?? null,
        order_status: mapMerchantOrderToOrderStatus(merchantOrder),
        payment_status: lastPayment?.status ?? merchantOrder.order_status ?? merchantOrder.status ?? null,
        payment_status_detail: lastPayment?.status_details ?? null,
        last_webhook_event_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('external_reference', merchantOrder.external_reference)
        .select('*')
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}
