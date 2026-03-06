import { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { mercadopagoService } from '../services/mercadopagoService';
import { useCart } from '../hooks/useCart';

// Inicialize com a PublicKey que vem do arquivo .env
const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY || '';
initMercadoPago(mpPublicKey);

export const CheckoutButton = () => {
    const { items, subtotal } = useCart();
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Assim que o componente montar ou itens do carrinho mudarem, 
    // nós pedimos uma nova preferência para o nosso backend fictício no Supabase
    useEffect(() => {
        if (items.length > 0) {
            const fetchPreference = async () => {
                setIsLoading(true);
                try {
                    const id = await mercadopagoService.createPreference({
                        items,
                        total: subtotal
                    });
                    setPreferenceId(id);
                } catch (error) {
                    console.error("Erro ao configurar checkout do MP:", error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchPreference();
        } else {
            setPreferenceId(null);
        }
    }, [items, subtotal]);

    if (items.length === 0) {
        return (
            <button
                disabled
                className="w-full h-12 bg-gray-300 text-white rounded-xl font-bold flex items-center justify-center cursor-not-allowed"
            >
                Carrinho Vazio
            </button>
        );
    }

    return (
        <div className="w-full mt-4 flex flex-col gap-3">
            {isLoading ? (
                <button
                    disabled
                    className="w-full h-16 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center cursor-not-allowed"
                >
                    <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </button>
            ) : preferenceId ? (
                <div className="w-full relative z-0">
                    {/* Componente oficial de carteira e parcelamento do Mercado Pago SDK */}
                    {/* @ts-expect-error - MercadoPago typings are incomplete */}
                    <Wallet
                        initialization={{
                            preferenceId: preferenceId as string,
                            redirectMode: 'self'
                        }}
                        onSubmit={async () => console.log('Checkout disparado')}
                        onReady={() => console.log('Wallet MP Carregada')}
                    />
                </div>
            ) : (
                <button
                    disabled
                    className="w-full h-16 bg-red-400 text-white rounded-2xl font-bold flex items-center justify-center cursor-not-allowed"
                >
                    Erro ao processar pagamento
                </button>
            )}

        </div>
    );
};
