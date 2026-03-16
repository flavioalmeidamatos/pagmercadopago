import { useState } from 'react';
import { useCart } from '../hooks/useCart';

export const CheckoutButton = () => {
    const { items, subtotal } = useCart();
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);
        // Simulação de checkout - em um projeto real, isso seria integrado com um gateway de pagamento
        alert(`Checkout simulado!\nTotal: R$ ${subtotal.toFixed(2)}\nItens: ${items.length}`);
        setIsLoading(false);
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <button
                onClick={handleCheckout}
                disabled={items.length === 0 || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {isLoading ? 'Processando...' : `Finalizar Compra - R$ ${subtotal.toFixed(2)}`}
            </button>
            {items.length === 0 && (
                <p className="text-gray-500 text-sm mt-2 text-center">
                    Adicione itens ao carrinho para continuar
                </p>
            )}
        </div>
    );
};
