import { useState } from 'react';
import { useCart } from '../hooks/useCart';

export const CheckoutButton = () => {
    const { items, subtotal } = useCart();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        setIsLoading(true);
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
            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('Resposta inesperada do servidor');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Seu e-mail"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 mb-3"
                type="email"
            />

            <button
                onClick={handleCheckout}
                disabled={items.length === 0 || isLoading || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {isLoading ? 'Redirecionando...' : `Finalizar Compra - R$ ${subtotal.toFixed(2)}`}
            </button>

            {items.length === 0 && (
                <p className="text-gray-500 text-sm mt-2 text-center">
                    Adicione itens ao carrinho para continuar
                </p>
            )}

            {error && (
                <p className="text-center text-sm text-red-600 mt-3">{error}</p>
            )}
        </div>
    );
};
