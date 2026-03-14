import { extractWebhookSignatureInfo, isValidWebhookSignature } from '../../server/mp_common.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    if (!process.env.MP_WEBHOOK_SECRET) {
        console.warn("⚠️ Webhook recebido sem headers de validação ou secret configurado.");
        return res.status(200).send();
    }

    try {
        const signatureInfo = extractWebhookSignatureInfo({
            headers: req.headers,
            query: req.query,
            body: req.body
        });

        if (!signatureInfo) {
            console.warn("⚠️ Webhook recebido com assinatura ou payload incompleto.");
            return res.status(200).send();
        }

        if (isValidWebhookSignature(process.env.MP_WEBHOOK_SECRET, signatureInfo)) {
            console.log(`✅ Webhook validado com sucesso! Ação: ${req.body.action || 'Desconhecida'} | ID: ${signatureInfo.dataId}`);
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
