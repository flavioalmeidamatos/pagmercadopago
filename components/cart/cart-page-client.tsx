"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckoutButton } from "@/components/store/checkout-button";
import { defaultSiteSettings } from "@/lib/site";
import { calculateCartTotals } from "@/lib/commerce";
import { defaultCoupons } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export function CartPageClient() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const isEmailValid = useMemo(() => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9]{2,}$/;
    return emailRegex.test(email);
  }, [email]);

  const coupon = useMemo(
    () => defaultCoupons.find((entry) => entry.code === couponCode.trim().toUpperCase()) ?? null,
    [couponCode]
  );

  const totals = calculateCartTotals(
    items,
    defaultSiteSettings.shippingFlatRate,
    coupon
  );

  if (!items.length) {
    return (
      <Card className="mx-auto max-w-2xl bg-white/90">
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-3xl font-semibold">Seu carrinho está vazio</h1>
          <p className="text-muted">Explore o catálogo para montar seu ritual de compra.</p>
          <Button asChild>
            <Link href="/catalog">Ir para o catálogo</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <h1 className="text-4xl font-semibold tracking-tight">Carrinho</h1>
        {items.map((item) => (
          <Card key={item.id} className="bg-white/90">
            <CardContent className="flex gap-4 p-4 sm:p-5">
              <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-secondary">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted">{item.brand}</p>
                  </div>
                  <button className="text-danger" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full border border-border p-1"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      className="rounded-full border border-border p-1"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit bg-white/90">
        <CardHeader>
          <CardTitle>Resumo do pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Frete</span>
            <span>{formatCurrency(totals.shipping)}</span>
          </div>

          <div className="space-y-2 border-y border-border py-4">
            <label className="text-sm font-semibold text-foreground">Confirmar E-mail para Recibo</label>
            <Input
              type="email"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail para finalizar"
              className={!isEmailValid && email ? "border-danger" : ""}
            />
            {!isEmailValid && email && (
              <p className="text-xs text-danger">Por favor, insira um e-mail válido.</p>
            )}
            <p className="text-xs text-muted">
              O pagamento só será liberado após a validação do e-mail.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted">Cupom de desconto</label>
            <Input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Ex.: LUXE10"
            />
            {coupon && (
              <p className="text-sm text-success">Cupom aplicado: {coupon.code}</p>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Desconto</span>
            <span>- {formatCurrency(totals.discount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
          <CheckoutButton couponCode={coupon?.code} forceEmail={email} disabled={!isEmailValid} />
          <Button variant="outline" className="w-full" onClick={clearCart}>
            Limpar carrinho
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
