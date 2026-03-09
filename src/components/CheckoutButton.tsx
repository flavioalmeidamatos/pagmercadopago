import { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { mercadopagoService } from '../services/mercadopagoService';
import { useCart } from '../hooks/useCart';

// Inicialize com a PublicKey que vem do arquivo .env (limpando qualquer caractere invisível)
const mpPublicKey = (import.meta.env.VITE_MP_PUBLIC_KEY || '').trim();
if (mpPublicKey) {
    initMercadoPago(mpPublicKey);
}

export const CheckoutButton = () => {
    const { items, subtotal } = useCart();
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isWalletReady, setIsWalletReady] = useState(false);

    // Assim que o componente montar ou itens do carrinho mudarem, 
    // nós pedimos uma nova preferência para o nosso backend
    useEffect(() => {
        if (items.length > 0) {
            const fetchPreference = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const id = await mercadopagoService.createPreference({
                        items,
                        total: subtotal
                    });
                    setPreferenceId(id);
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Erro inesperado ao configurar pagamento';
                    console.error("Erro ao configurar checkout do MP:", err);
                    setError(errorMessage);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchPreference();
        } else {
            setPreferenceId(null);
            setError(null);
        }
    }, [items, subtotal, retryCount]);

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
                    className="w-full h-12 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center cursor-not-allowed"
                >
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </button>
            ) : preferenceId ? (
                <div className="w-full relative z-0 min-h-[48px] flex items-center justify-center">
                    {!isWalletReady && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 rounded-xl animate-pulse">
                            <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    <div className={`w-full transition-opacity duration-300 ${isWalletReady ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Componente oficial de carteira e parcelamento do Mercado Pago SDK */}
                        {/* @ts-expect-error - MercadoPago typings are incomplete */}
                        <Wallet
                            initialization={{
                                preferenceId: preferenceId as string,
                                redirectMode: 'self'
                            }}
                            onSubmit={async () => console.log('Checkout disparado')}
                            onReady={() => {
                                console.log('Wallet MP Carregada');
                                setIsWalletReady(true);
                            }}
                        />
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            setError(null);
                            setRetryCount(prev => prev + 1);
                        }}
                        className="w-full h-16 bg-red-100 text-red-600 rounded-2xl font-bold flex items-center justify-center hover:bg-red-200 transition-colors"
                    >
                        Tentar Novamente
                    </button>
                    <p className="text-xs text-red-500 text-center px-2">{error}</p>
                </div>
            ) : (
                <button
                    disabled
                    className="w-full h-12 bg-red-400 text-white rounded-xl text-sm font-bold flex items-center justify-center cursor-not-allowed"
                >
                    Erro ao processar pagamento
                </button>
            )}

        </div>
    );
};
