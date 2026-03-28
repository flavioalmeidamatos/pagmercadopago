import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { getProducts, validateCoupon } from "@/lib/data/store";
import { calculateCartTotals } from "@/lib/commerce";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive()
    })
  ),
  couponCode: z.string().optional()
});

export async function POST(request: Request) {
  const stripe = getStripe();
  const user = await getCurrentUser();
  // The generated Database type is not complete enough for typed writes yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any;

  if (!user) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  if (!stripe || !supabase) {
    return NextResponse.json(
      { error: "Stripe ou Supabase service role não configurados." },
      { status: 500 }
    );
  }

  const payload = checkoutSchema.parse(await request.json());
  const products = await getProducts();
  const selectedItems = payload.items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product) {
        return null;
      }
      return {
        ...item,
        product
      };
    })
    .filter(Boolean) as Array<{ id: string; quantity: number; product: (typeof products)[number] }>;

  if (!selectedItems.length) {
    return NextResponse.json({ error: `Carrinho vazio (IDs enviados: ${payload.items.map(i => i.id).join(", ")}, Encontrados no BD: ${products.length})` }, { status: 400 });
  }

  const coupon = payload.couponCode ? await validateCoupon(payload.couponCode) : null;
  const totals = calculateCartTotals(
    selectedItems.map((item) => ({
      id: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      brand: item.product.brand,
      price: item.product.price,
      image: item.product.images[0]?.image_url ?? "",
      quantity: item.quantity
    })),
    24.9,
    coupon
  );

  let stripeCustomerId: string | null = null;
  const { data: customerRow } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  stripeCustomerId = customerRow?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        user_id: user.id
      }
    });

    stripeCustomerId = customer.id;
    await supabase.from("customers").upsert({
      user_id: user.id,
      stripe_customer_id: stripeCustomerId
    });
  } else if (user.email) {
    await stripe.customers.update(stripeCustomerId, {
      email: user.email
    });
  }

  const { data: createdOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal_amount: totals.subtotal,
      shipping_amount: totals.shipping,
      discount_amount: totals.discount,
      total_amount: totals.total,
      coupon_code: coupon?.code ?? null,
      stripe_customer_id: stripeCustomerId
    })
    .select()
    .single();

  if (orderError || !createdOrder) {
    return NextResponse.json({ error: "Não foi possível criar o pedido." }, { status: 500 });
  }

  await supabase.from("order_items").insert(
    selectedItems.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
      image_url: item.product.images[0]?.image_url ?? null
    }))
  );

  let session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "boleto"],
    customer: stripeCustomerId,
    success_url: `${env.siteUrl}/?checkout=success`,
    cancel_url: `${env.siteUrl}/cart?checkout=cancelled`,
    payment_intent_data: {
      metadata: {
        order_id: createdOrder.id,
        user_id: user.id,
        buyer_email: user.email ?? ""
      }
    },
    metadata: {
      order_id: createdOrder.id,
      user_id: user.id,
      buyer_email: user.email ?? "",
      coupon_code: coupon?.code ?? ""
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: Math.round(totals.shipping * 100),
            currency: "brl"
          },
          display_name: "Frete fixo premium"
        }
      }
    ],
    line_items: selectedItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "brl",
        product_data: {
          name: item.product.name,
          description: item.product.subtitle,
          images: item.product.images[0]?.image_url ? [item.product.images[0].image_url] : []
        },
        unit_amount: Math.round(item.product.price * 100)
      }
    }))
  });
  } catch (err: any) {
    console.error("Stripe error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  await supabase
    .from("orders")
    .update({
      stripe_session_id: session.id
    })
    .eq("id", createdOrder.id);

  await supabase.from("payments").insert({
    order_id: createdOrder.id,
    amount: totals.total,
    stripe_customer_id: stripeCustomerId,
    stripe_session_id: session.id,
    provider: "stripe",
    provider_status: session.payment_status
  });

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
