import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { products } from './data/products';
import { ProductCarousel } from './components/ProductCarousel';
import { ProductDetails } from './components/ProductDetails';
import { CartDrawer } from './components/CartDrawer';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import type { Product } from './types/product';
import { motion } from 'framer-motion';

const StoreContent = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header onCartOpen={() => setIsCartOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 sm:py-12 md:px-8 md:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 inline-block rounded-full bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500 sm:mb-4 sm:px-4 sm:text-xs sm:tracking-widest"
          >
            Coleção Botik & Cica
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-black leading-[1.05] tracking-tight text-gray-900 sm:text-4xl md:text-5xl lg:text-7xl"
          >
            Produtos em Destaque
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-4 max-w-xl px-2 text-sm leading-relaxed text-gray-500 sm:mt-6 sm:max-w-2xl sm:px-0 sm:text-lg md:text-xl"
          >
            Descubra o cuidado avançado com fórmulas inovadoras para iluminar, firmar e renovar sua pele todos os dias.
          </motion.p>
        </div>

        <ProductCarousel
          products={products}
          onSelect={setSelectedProduct}
          selectedId={selectedProduct?.id}
        />

        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-900 rounded-[40px] p-12 overflow-hidden relative group">
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-4">Nova Linha Retinol</h3>
              <p className="text-gray-400 mb-8 max-w-xs">Redução visível de rugas e uniformização da textura em 2 semanas.</p>
              <button className="px-6 py-2.5 bg-white text-gray-900 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-gray-100 transition-all cursor-pointer">Saiba Mais</button>
            </div>
          </div>
          <div className="bg-rose-100 rounded-[40px] p-12 flex flex-col justify-end">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Cuide da sua barreira</h3>
            <p className="text-rose-700/70 mb-8">Pantenol e Ceramidas para hidratação profunda e reparação imediata.</p>
            <button className="px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-gray-800 transition-all w-fit cursor-pointer">Ver Kit Completo</button>
          </div>
        </div>
      </main>

      <Footer />

      <ProductDetails product={selectedProduct} onClose={() => setSelectedProduct(null)} />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <CookieConsent />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/" element={<StoreContent />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
