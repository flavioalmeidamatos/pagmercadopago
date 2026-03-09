import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    // Se as headers não existirem, ignoramos
    if (!xSignature || !xRequestId || !process.env.MP_WEBHOOK_SECRET) {
        console.warn("⚠️ Webhook recebido sem headers de validação ou secret configurado.");
        return res.status(200).send();
    }

    try {
        const parts = xSignature.split(',');
        let ts, hash;
        parts.forEach(p => {
            const [key, value] = p.split('=');
            if (key && value) {
                if (key.trim() === 't') ts = value.trim();
                if (key.trim() === 'v1') hash = value.trim();
            }
        });

        const dataID = req.body?.data?.id;

        if (!dataID || !ts || !hash) {
            console.warn("⚠️ Webhook recebido com assinatura ou payload incompleto.");
            return res.status(200).send();
        }

        const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;

        const calculatedHash = crypto
            .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
            .update(manifest)
            .digest('hex');

        if (calculatedHash === hash) {
            console.log(`✅ Webhook validado com sucesso! Ação: ${req.body.action || 'Desconhecida'} | ID: ${dataID}`);
            // Adicione a logica de salvar no banco aqui.
        } else {
            console.error('❌ Assinatura de Webhook inválida!');
        }

        return res.status(200).send();

    } catch (error) {
        console.error('❌ Erro no webhook:', error.message);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
