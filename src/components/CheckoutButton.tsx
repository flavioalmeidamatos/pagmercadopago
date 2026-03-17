import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '../hooks/useCart';

const MERCADO_PAGO_SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const WALLET_CONTAINER_ID = 'mercado-pago-wallet-container';

type WalletBrickController = {
    unmount: () => void;
};

type WalletBrickBuilder = {
    create: (
        type: 'wallet',
        containerId: string,
        settings: {
            initialization: {
                preferenceId: string;
            };
            customization?: {
                texts?: {
                    valueProp?: 'smart_option';
                };
            };
            callbacks?: {
                onReady?: () => void;
                onError?: (error: unknown) => void;
            };
        },
    ) => Promise<WalletBrickController>;
};

type MercadoPagoInstance = {
    bricks: () => WalletBrickBuilder;
};

declare global {
    interface Window {
        MercadoPago?: new (
            publicKey: string,
            options?: {
                locale?: string;
            },
        ) => MercadoPagoInstance;
    }
}

export const CheckoutButton = () => {
    const { items, subtotal } = useCart();
    const [email, setEmail] = useState('');
    const [sdkReady, setSdkReady] = useState(false);
    const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
    const [isRenderingBrick, setIsRenderingBrick] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const walletBrickRef = useRef<WalletBrickController | null>(null);
    const mercadoPagoRef = useRef<MercadoPagoInstance | null>(null);
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    const formattedSubtotal = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(subtotal);
    const cartFingerprint = useMemo(
        () => JSON.stringify(items.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price }))),
        [items],
    );

    useEffect(() => {
        if (!publicKey) {
            setError('A chave pública do Mercado Pago não foi configurada.');
            return;
        }

        if (window.MercadoPago) {
            mercadoPagoRef.current = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
            setSdkReady(true);
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${MERCADO_PAGO_SDK_URL}"]`);

        const handleLoad = () => {
            if (!window.MercadoPago) {
                setError('Não foi possível inicializar o SDK do Mercado Pago.');
                return;
            }

            mercadoPagoRef.current = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
            setSdkReady(true);
        };

        const handleError = () => {
            setError('Falha ao carregar o SDK do Mercado Pago.');
        };

        if (existingScript) {
            existingScript.addEventListener('load', handleLoad);
            existingScript.addEventListener('error', handleError);

            return () => {
                existingScript.removeEventListener('load', handleLoad);
                existingScript.removeEventListener('error', handleError);
            };
        }

        const script = document.createElement('script');
        script.src = MERCADO_PAGO_SDK_URL;
        script.async = true;
        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        document.body.appendChild(script);

        return () => {
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);
        };
    }, [publicKey]);

    useEffect(() => {
        return () => {
            walletBrickRef.current?.unmount();
            walletBrickRef.current = null;
        };
    }, []);

    useEffect(() => {
        walletBrickRef.current?.unmount();
        walletBrickRef.current = null;
        setPreferenceId(null);
        setError(null);
    }, [cartFingerprint]);

    useEffect(() => {
        if (!preferenceId || !sdkReady || !mercadoPagoRef.current) {
            return;
        }

        let cancelled = false;
        setIsRenderingBrick(true);
        setError(null);

        walletBrickRef.current?.unmount();
        walletBrickRef.current = null;

        mercadoPagoRef.current
            .bricks()
            .create('wallet', WALLET_CONTAINER_ID, {
                initialization: {
                    preferenceId,
                },
                customization: {
                    texts: {
                        valueProp: 'smart_option',
                    },
                },
                callbacks: {
                    onReady: () => {
                        if (!cancelled) {
                            setIsRenderingBrick(false);
                        }
                    },
                    onError: (brickError) => {
                        console.error('Erro ao renderizar Wallet Brick:', brickError);
                        if (!cancelled) {
                            setIsRenderingBrick(false);
                            setError('Não foi possível exibir o checkout do Mercado Pago.');
                        }
                    },
                },
            })
            .then((controller) => {
                if (cancelled) {
                    controller.unmount();
                    return;
                }

                walletBrickRef.current = controller;
            })
            .catch((brickError) => {
                console.error('Erro ao criar Wallet Brick:', brickError);
                if (!cancelled) {
                    setIsRenderingBrick(false);
                    setError('Não foi possível iniciar o checkout do Mercado Pago.');
                }
            });

        return () => {
            cancelled = true;
            walletBrickRef.current?.unmount();
            walletBrickRef.current = null;
        };
    }, [preferenceId, sdkReady]);

    const handleCheckout = async () => {
        setIsPreparingCheckout(true);
        setError(null);

        try {
            const response = await fetch('/api/create_preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    payer: {
                        email,
                    },
                }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => null);
                throw new Error(result?.error || 'Erro ao iniciar checkout');
            }

            const data = await response.json();
            if (data.preference_id) {
                setPreferenceId(data.preference_id);
            } else {
                throw new Error('Resposta inesperada do servidor');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(message);
        } finally {
            setIsPreparingCheckout(false);
        }
    };

    return (
        <div className="w-full space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Etapa 1
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            Informe seu e-mail para receber a confirmação
                        </p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formattedSubtotal}</p>
                </div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    E-mail do comprador
                </label>
                <input
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                        if (preferenceId) {
                            setPreferenceId(null);
                        }
                    }}
                    placeholder="voce@email.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    type="email"
                />

                <button
                    onClick={handleCheckout}
                    disabled={items.length === 0 || isPreparingCheckout || isRenderingBrick || !email.trim() || !sdkReady}
                    className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {isPreparingCheckout
                        ? 'Preparando checkout...'
                        : preferenceId
                            ? 'Atualizar checkout'
                            : `Continuar para pagamento • ${formattedSubtotal}`}
                </button>
            </div>

            <div className="min-h-14 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Etapa 2
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            Botão oficial do Mercado Pago
                        </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                        Checkout seguro
                    </span>
                </div>

                {preferenceId ? (
                    <div className="space-y-2">
                        <div id={WALLET_CONTAINER_ID} />
                        {isRenderingBrick && (
                            <p className="text-center text-sm text-slate-500">
                                Carregando o checkout seguro do Mercado Pago...
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-sm leading-relaxed text-slate-500">
                        Gere o checkout para exibir aqui o botão oficial do Mercado Pago.
                    </p>
                )}
            </div>

            {items.length === 0 && (
                <p className="text-center text-sm text-slate-500">
                    Adicione itens ao carrinho para continuar
                </p>
            )}

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-center text-sm text-red-700">{error}</p>
                </div>
            )}
        </div>
    );
};
