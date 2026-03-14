import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPixPayment, getOrderStatus, processMercadoPagoWebhook } from './pix_service.js';
import { getMercadoPagoAccessToken } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

try {
    getMercadoPagoAccessToken();
} catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exit(1);
}

app.post('/api/create_preference', async (req, res) => {
    try {
        const result = await createPixPayment({
            req,
            payload: req.body
        });
        res.json(result);
    } catch (error) {
        const statusCode = error.message?.includes('inválido')
            || error.message?.includes('não encontrado')
            ? 400
            : 500;

        console.error('[Express] Erro ao criar pagamento PIX:', {
            message: error.message,
            stack: error.stack
        });
        res.status(statusCode).json({
            error: statusCode === 400
                ? error.message
                : 'Erro local ao criar pagamento PIX',
            details: error.message
        });
    }
});

app.get('/api/order_status', async (req, res) => {
    try {
        const orderId = String(req.query.orderId || '').trim();
        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório.' });
        }

        const result = await getOrderStatus(orderId);
        return res.json(result);
    } catch (error) {
        const statusCode = error.message?.includes('não encontrado') ? 404 : 500;
        console.error('[Express] Erro ao consultar status do pedido:', {
            message: error.message,
            stack: error.stack
        });
        return res.status(statusCode).json({
            error: statusCode === 404 ? error.message : 'Erro ao consultar pedido'
        });
    }
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
        const result = await processMercadoPagoWebhook({ req });
        return res.status(result.httpStatus).json(result.body);
    } catch (error) {
        console.error('❌ Erro interno ao validar webhook:', error.message);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
