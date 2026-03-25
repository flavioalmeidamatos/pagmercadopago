import { useState } from 'react';
import { useCart } from '../hooks/useCart';

export const CheckoutButton = () => {
    const { items, subtotal } = useCart();
    const [email, setEmail] = useState('');
    const formattedSubtotal = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(subtotal);

    return (
        <div className="w-full space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Etapa 1
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            Revise os dados do pedido
                        </p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formattedSubtotal}</p>
                </div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    E-mail do comprador (opcional)
                </label>
                <input
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                    }}
                    placeholder="voce@email.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    type="email"
                />

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    O checkout está temporariamente indisponível enquanto o novo gateway de pagamento é integrado.
                </div>
            </div>

            <div className="min-h-14 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Etapa 2
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            Próximo gateway
                        </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                        Em preparação
                    </span>
                </div>

                <p className="text-center text-sm leading-relaxed text-slate-500">
                    Mantivemos o carrinho e o resumo do pedido prontos para receber a nova integração de pagamento.
                </p>
            </div>

            {items.length === 0 && (
                <p className="text-center text-sm text-slate-500">
                    Adicione itens ao carrinho para continuar
                </p>
            )}
        </div>
    );
};
