import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { Pedido } from '../lib/supabase';

function useQueryParams() {
    return new URLSearchParams(useLocation().search);
}

export const CheckoutResult = () => {
    const query = useQueryParams();
    const statusFromQuery = query.get('status') || query.get('collection_status') || 'unknown';
    const paymentId = query.get('payment_id') || query.get('collection_id');
    const preferenceId = query.get('preference_id');
    const merchantOrderId = query.get('merchant_order_id');
    const externalReference = query.get('external_reference');
    const [order, setOrder] = useState<Pedido | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams();

        if (externalReference) {
            params.set('external_reference', externalReference);
        } else if (paymentId) {
            params.set('payment_id', paymentId);
        } else if (merchantOrderId) {
            params.set('merchant_order_id', merchantOrderId);
        } else if (preferenceId) {
            params.set('preference_id', preferenceId);
        } else {
            return;
        }

        const controller = new AbortController();

        async function loadOrder() {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/checkout_status?${params.toString()}`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    return;
                }

                const result = await response.json();
                setOrder(result.order ?? null);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
            } finally {
                setIsLoading(false);
            }
        }

        loadOrder();

        return () => controller.abort();
    }, [externalReference, merchantOrderId, paymentId, preferenceId]);

    const status = order?.payment_status || order?.order_status || statusFromQuery;

    const title = useMemo(() => {
        if (status === 'approved' || status === 'paid') return 'Pagamento aprovado';
        if (status === 'failure' || status === 'rejected' || status === 'cancelled' || status === 'failed') return 'Pagamento recusado';
        if (status === 'pending' || status === 'in_process') return 'Pagamento pendente';
        if (status === 'refunded') return 'Pagamento estornado';
        return 'Resultado do pagamento';
    }, [status]);

    const description = useMemo(() => {
        if (status === 'approved' || status === 'paid') {
            return 'Seu pagamento foi aprovado com sucesso! Obrigado pela compra.';
        }
        if (status === 'failure' || status === 'rejected' || status === 'cancelled' || status === 'failed') {
            return 'O pagamento não foi concluído. Tente novamente ou escolha outro método de pagamento.';
        }
        if (status === 'pending' || status === 'in_process') {
            return 'Seu pagamento está em processamento. Volte mais tarde para verificar o status.';
        }
        if (status === 'refunded') {
            return 'O pagamento foi estornado. Se precisar, consulte o suporte para mais detalhes.';
        }
        return 'Não foi possível identificar o resultado do pagamento.';
    }, [status]);

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    <p className="mt-2 text-gray-600">{description}</p>
                </div>
            </header>

            <main className="flex-grow max-w-3xl mx-auto px-4 py-10">
                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Detalhes da Transação</h2>
                    <dl className="space-y-3 text-sm text-gray-700">
                        {preferenceId && (
                            <div className="flex justify-between">
                                <dt className="font-medium">Preference ID</dt>
                                <dd className="text-right">{preferenceId}</dd>
                            </div>
                        )}
                        {paymentId && (
                            <div className="flex justify-between">
                                <dt className="font-medium">Payment / Collection ID</dt>
                                <dd className="text-right">{paymentId}</dd>
                            </div>
                        )}
                        {merchantOrderId && (
                            <div className="flex justify-between">
                                <dt className="font-medium">Merchant Order ID</dt>
                                <dd className="text-right">{merchantOrderId}</dd>
                            </div>
                        )}
                        {order?.external_reference && (
                            <div className="flex justify-between">
                                <dt className="font-medium">Referência</dt>
                                <dd className="text-right">{order.external_reference}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="font-medium">Status</dt>
                            <dd className="text-right capitalize">{status}</dd>
                        </div>
                        {order?.payment_status_detail && (
                            <div className="flex justify-between">
                                <dt className="font-medium">Detalhe</dt>
                                <dd className="text-right">{order.payment_status_detail}</dd>
                            </div>
                        )}
                    </dl>

                    {isLoading && <p className="mt-4 text-sm text-gray-500">Atualizando status do pedido...</p>}

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition"
                        >
                            Voltar à loja
                        </Link>
                        <a
                            href="https://www.mercadopago.com.br/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Suporte Mercado Pago
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};
