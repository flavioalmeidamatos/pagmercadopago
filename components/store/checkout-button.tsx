"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function CheckoutButton({
  couponCode,
  forceEmail,
  disabled = false
}: {
  couponCode?: string;
  forceEmail?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { items } = useCart();
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthState() {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        if (isMounted) {
          setRequiresAuth(true);
        }
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (isMounted) {
        setRequiresAuth(!user);
      }
    }

    void loadAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCheckout() {
    if (!items.length) {
      toast.error("Seu carrinho está vazio.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      toast.error("Entre ou crie sua conta para confirmar o pagamento.");
      router.push("/login?next=/cart");
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Entre ou crie sua conta para confirmar o pagamento.");
      router.push("/login?next=/cart");
      return;
    }

    setRequiresAuth(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          couponCode,
          forceEmail
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setRequiresAuth(true);
          toast.error("Entre ou crie sua conta para confirmar o pagamento.");
          router.push("/login?next=/cart");
          return;
        }

        throw new Error(result.error || "Não foi possível iniciar o checkout.");
      }

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      throw new Error("URL de checkout não retornada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha inesperada no checkout."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isLoading || disabled}>
        {isLoading ? (
          "Redirecionando para o pagamento..."
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Finalizar Pagamento Seguro
          </>
        )}
      </Button>
      {requiresAuth && (
        <p className="text-center text-sm text-muted">
          Entre ou crie sua conta para confirmar o pagamento.{" "}
          <Link href="/login?next=/cart" className="font-medium text-foreground underline">
            Fazer login ou cadastro
          </Link>
        </p>
      )}
    </div>
  );
}
