import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';
dotenv.config();

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 5000 } });

async function test() {
    const preference = new Preference(client);
    try {
        const result = await preference.create({
            body: {
                items: [{
                    id: 'test',
                    title: 'Test Product',
                    quantity: 1,
                    unit_price: 10
                }],
                back_urls: {
                    success: 'http://localhost:5173/',
                    failure: 'http://localhost:5173/',
                    pending: 'http://localhost:5173/'
                }
            }
        });
        console.log("Success:", result.id);
    } catch (error) {
        console.error("Error creating preference:", JSON.stringify(error, null, 2));
    }
}
test();
