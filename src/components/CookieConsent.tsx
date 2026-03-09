import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    const acceptCookies = useCallback(() => {
        localStorage.setItem('cookie_consent', 'true');
        setIsVisible(false);
    }, []);

    useEffect(() => {
        // Verifica se o usuário já tem o consentimento salvo
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        if (isVisible) {
            // Aceita automaticamente após 6 segundos se estiver visível
            const timer = setTimeout(() => {
                acceptCookies();
            }, 6000);

            return () => clearTimeout(timer);
        }
    }, [isVisible, acceptCookies]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:px-8 border-t border-gray-800"
                >
                    <p className="text-xs sm:text-sm text-gray-300 text-center sm:text-left leading-relaxed max-w-5xl">
                        Nossa loja utiliza cookies essenciais para garantir segurança no checkout e aprimorar a sua experiência de navegação.
                        Ao continuar, assumimos que você concorda com a nossa política.
                    </p>
                    <button
                        onClick={acceptCookies}
                        className="w-full sm:w-auto px-6 py-2.5 bg-white text-gray-900 text-sm font-bold rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        Entendi
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
