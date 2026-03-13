import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMPPreference } from './mp_common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Verifica se o token existe antes de iniciar
if (!process.env.MP_ACCESS_TOKEN) {
    console.error("ERRO: MP_ACCESS_TOKEN não está definido no arquivo .env");
    process.exit(1);
}

app.post('/api/create_preference', async (req, res) => {
    try {
        const { items } = req.body;

        // Origem dinâmica para redirecionamentos locais
        let backUrl = 'http://localhost:5173';
        if (req.headers.origin && req.headers.origin !== 'null') {
            backUrl = req.headers.origin;
        }

        const result = await createMPPreference(
            process.env.MP_ACCESS_TOKEN,
            items,
            backUrl
        );

        console.log(`[Local Server] Preferência Gerada: ${result.id}`);
        res.json({ id: result.id });
    } catch (error) {
        console.error('[Express] Erro ao criar preferência:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Erro local ao criar preferência de pagamento',
            details: error.message
        });
    }
});

// Rota para receber os Webhooks do Mercado Pago
app.post('/api/webhooks/mercadopago', (req, res) => {
    // 1. O Mercado Pago exige que respondamos com 200/201 logo de imediato
    res.status(200).send('Webhook recebido com sucesso');

    console.log("\n🔔 [WEBHOOK RECEBIDO] Evento disparado pelo Mercado Pago!");
    console.log("-> Action:", req.body?.action || req.body?.type || 'Notificação genérica');

    // Validação de Segurança
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    if (!xSignature || !xRequestId || !process.env.MP_WEBHOOK_SECRET) {
        console.log("⚠️ Aviso: Faltando headers de validação (x-signature) ou MP_WEBHOOK_SECRET não configurado. Logs continuarão normais, mas a integridade não pôde ser atestada.");
        return;
    }

    try {
        // 2. Extrair parâmetros v1 e t da assinatura
        const parts = xSignature.split(',');
        let ts, hash;
        parts.forEach(p => {
            const [key, value] = p.split('=');
            if (key && value) {
                if (key.trim() === 't') ts = value.trim();
                if (key.trim() === 'v1') hash = value.trim();
            }
        });

        // 3. Obter o id da notificação a partir do body
        const dataID = req.body?.data?.id;

        if (!dataID || !ts || !hash) {
            console.log("⚠️ Arquitetura do webhook recebido não permite validação completa de assinatura.");
            return;
        }

        // 4. Montar a string manifest para validação da assinatura conforme documentação
        const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;

        // 5. Calcular HMAC-SHA256
        const calculatedHash = crypto
            .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
            .update(manifest)
            .digest('hex');

        // 6. Verificar
        if (calculatedHash === hash) {
            console.log(`✅ Webhook Genuíno Validado (HMAC-SHA256)! ID do Pagamento: ${dataID}`);
        } else {
            console.error('❌ ALERTA DE SEGURANÇA: Assinatura de Webhook inválida! Possível tentativa de fraude.');
        }
    } catch (error) {
        console.error('❌ Erro interno ao validar webhook:', error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
