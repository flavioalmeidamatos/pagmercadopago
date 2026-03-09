import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
