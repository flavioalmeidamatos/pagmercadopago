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

export function hasSupabaseAdminConfig() {
    const url = readEnv(['NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL']);
    const secretKey = readEnv(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);

    return Boolean(url && secretKey);
}

export function getMercadoPagoAccessToken() {
    return readEnv(['MERCADOPAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN'], {
        required: true,
        label: 'Access Token do Mercado Pago'
    });
}

function getFirstHeaderValue(value) {
    if (Array.isArray(value)) {
        return value[0] || '';
    }

    return String(value || '')
        .split(',')[0]
        .trim();
}

function normalizeBaseUrl(value) {
    if (!value || value === 'null' || value === 'undefined') {
        return '';
    }

    const candidate = String(value).trim().replace(/\/+$/, '');

    try {
        const url = new URL(candidate);
        return url.origin;
    } catch {
        return '';
    }
}

export function getRequestBaseUrl(req, fallback = '') {
    const origin = normalizeBaseUrl(req.headers.origin);
    if (origin) {
        return origin;
    }

    const referer = getFirstHeaderValue(req.headers.referer);
    if (referer) {
        try {
            return new URL(referer).origin;
        } catch {
            // Ignora referer inválido e continua a resolução.
        }
    }

    const forwardedProto = getFirstHeaderValue(req.headers['x-forwarded-proto']);
    const forwardedHost = getFirstHeaderValue(req.headers['x-forwarded-host']);
    const host = forwardedHost || getFirstHeaderValue(req.headers.host);

    if (host) {
        const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
        return `${protocol}://${host}`;
    }

    const configuredAppUrl = normalizeBaseUrl(
        readEnv(['FRONTEND_URL', 'APP_URL', 'SITE_URL', 'NEXT_PUBLIC_SITE_URL', 'VITE_APP_URL'])
    );
    if (configuredAppUrl) {
        return configuredAppUrl;
    }

    const vercelProductionUrl = normalizeBaseUrl(readEnv(['VERCEL_PROJECT_PRODUCTION_URL']));
    if (vercelProductionUrl) {
        return vercelProductionUrl;
    }

    const vercelUrl = readEnv(['VERCEL_URL']);
    if (vercelUrl) {
        return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
    }

    return fallback;
}
