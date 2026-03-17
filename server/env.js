export function readEnv(keys, { required = false, label } = {}) {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }

    if (required) {
        throw new Error(`${label || keys[0]} não configurado.`);
    }

    return '';
}

export function getSupabaseUrl() {
    return readEnv(['NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL'], {
        required: true,
        label: 'URL do Supabase'
    });
}

export function getSupabaseSecretKey() {
    return readEnv(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], {
        required: true,
        label: 'Chave secreta do Supabase'
    });
}

export function getMercadoPagoAccessToken() {
    return readEnv(['MERCADOPAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN'], {
        required: true,
        label: 'Access Token do Mercado Pago'
    });
}

export function getRequestBaseUrl(req, fallback = '') {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.headers.host;
    const origin = req.headers.origin;

    if (origin && origin !== 'null') {
        return origin;
    }

    if (host) {
        const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
        return `${protocol}://${host}`;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return fallback;
}
