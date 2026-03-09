import { createMPPreference } from './server/mp_common.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Revalidation test for the refactored Mercado Pago logic
 */
async function revalidateMp() {
    console.log("🚀 Iniciando revalidação do Mercado Pago...");

    if (!process.env.MP_ACCESS_TOKEN) {
        console.error("❌ ERRO: MP_ACCESS_TOKEN não encontrado no .env");
        process.exit(1);
    }

    const testItems = [
        {
            id: 'prod-001',
            name: 'Cica Balm Refactored',
            price: 129.90,
            quantity: 2,
            category: 'skincare',
            image: 'https://placeholder.com/image.jpg'
        }
    ];

    try {
        const result = await createMPPreference(
            process.env.MP_ACCESS_TOKEN,
            testItems,
            'http://localhost:5173',
            'https://webhook.site/test'
        );

        if (result && result.id) {
            console.log("✅ Sucesso! Preferência gerada:", result.id);
            console.log("🔗 URL de Checkout:", result.init_point);
        } else {
            throw new Error("Resposta inválida do Mercado Pago");
        }
    } catch (error) {
        console.error("❌ Falha na revalidação:", error.message);
        if (error.cause) console.error("Causa:", error.cause);
    }
}

revalidateMp();
