"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/components/cart/cart-provider";

export function CheckoutSuccessHandler() {
  const handledRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  useEffect(() => {
    if (handledRef.current || searchParams.get("checkout") !== "success") {
      return;
    }

    handledRef.current = true;
    clearCart();
    toast.success("Pagamento Concluído com Sucesso. Obrigado.");

    const timeoutId = window.setTimeout(() => {
      router.replace("/");
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [clearCart, router, searchParams]);

  return null;
}
