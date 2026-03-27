"use client";

import { ReactNode, Suspense } from "react";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/cart/cart-provider";
import { CheckoutSuccessHandler } from "@/components/store/checkout-success-handler";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <CheckoutSuccessHandler />
      </Suspense>
      {children}
      <Toaster richColors position="top-right" />
    </CartProvider>
  );
}
