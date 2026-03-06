import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Verifica se o token existe antes de iniciar o client
if (!process.env.MP_ACCESS_TOKEN) {
    console.error("ERRO: MP_ACCESS_TOKEN não está definido no arquivo .env");
    process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

app.post('/api/create_preference', async (req, res) => {
    try {
        const { items } = req.body;

        // items from frontend are CartItems: { id, name, price, quantity, ... }
        const externalItems = items.map(item => ({
            id: item.id,
            title: item.name,
            currency_id: 'BRL',
            picture_url: item.image,
            description: item.description,
            category_id: item.category,
            quantity: item.quantity,
            unit_price: Number(item.price)
        }));

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: externalItems,
                back_urls: {
                    success: 'http://localhost:5173',
                    failure: 'http://localhost:5173',
                    pending: 'http://localhost:5173'
                }
            }
        });

        res.json({ id: result.id });
    } catch (error) {
        console.error('Error creating preference:', error);
        res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
