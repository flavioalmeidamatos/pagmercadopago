import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { sendPaidOrderEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = getStripe();
  // The generated Database type is not complete enough for typed webhook mutations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any;
  const signature = (await headers()).get("stripe-signature");

  if (!stripe || !supabase || !env.stripeWebhookSecret || !signature) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assinatura inválida." },
      { status: 400 }
    );
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      console.info(`Webhook ${event.type} recebido.`, {
        orderId,
        sessionId: session.id,
        paymentStatus: session.payment_status
      });

      const { data: order } = await supabase
        .from("orders")
        .select("id, status, total_amount, shipping_amount, discount_amount, user_id")
        .eq("id", orderId)
        .maybeSingle();

      await supabase
        .from("orders")
        .update({
          status: session.payment_status === "paid" ? "paid" : "pending",
          stripe_session_id: session.id,
          payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null
        })
        .eq("id", orderId);

      await supabase
        .from("payments")
        .update({
          provider_status: session.payment_status,
          payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null
        })
        .eq("order_id", orderId);

      const checkoutBuyerEmail =
        session.customer_details?.email ??
        session.customer_email ??
        session.metadata?.buyer_email ??
        null;

      let buyerEmail = checkoutBuyerEmail;

      if (!buyerEmail && order?.user_id) {
        const {
          data: { user }
        } = await supabase.auth.admin.getUserById(order.user_id);

        buyerEmail = user?.email ?? null;
      }

      if (buyerEmail && session.payment_status === "paid") {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity, unit_price")
          .eq("order_id", orderId);

        await sendPaidOrderEmail({
          buyerEmail,
          orderId,
          totalAmount: Number(order?.total_amount ?? 0),
          shippingAmount: Number(order?.shipping_amount ?? 0),
          discountAmount: Number(order?.discount_amount ?? 0),
          items:
            items?.map(
              (item: { product_name: string; quantity: number; unit_price: number }) => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: Number(item.unit_price)
              })
            ) ?? []
        })
          .then((result) => {
            console.info("Confirmação de pagamento enviada para o comprador.", {
              orderId,
              buyerEmail,
              previousOrderStatus: order?.status ?? null,
              emailSource: session.customer_details?.email
                ? "customer_details"
                : session.customer_email
                  ? "customer_email"
                  : checkoutBuyerEmail
                    ? "metadata"
                    : "supabase_auth",
              formSubmitStatus: result?.status,
              redirectLocation: result?.location ?? null
            });
          })
          .catch((error) => {
            console.error("Erro ao enviar confirmação por e-mail:", {
              orderId,
              buyerEmail,
              error: error instanceof Error ? error.message : String(error)
            });
          });
      } else if (!buyerEmail) {
        console.warn("Webhook pago sem e-mail do comprador no checkout.", {
          orderId,
          sessionId: session.id,
          userId: order?.user_id ?? null
        });
      }
    } else {
      console.warn("Webhook checkout.session.completed sem order_id na metadata.", {
        sessionId: session.id
      });
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", orderId);

      await supabase
        .from("payments")
        .update({ provider_status: session.payment_status })
        .eq("order_id", orderId);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await supabase
        .from("orders")
        .update({
          status: "failed",
          payment_intent_id: paymentIntent.id
        })
        .eq("id", orderId);

      await supabase
        .from("payments")
        .update({
          provider_status: paymentIntent.status,
          payment_intent_id: paymentIntent.id
        })
        .eq("order_id", orderId);
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : null;

    if (paymentIntentId) {
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (payment) {
        await supabase
          .from("orders")
          .update({ status: "refunded" })
          .eq("id", payment.order_id);

        await supabase
          .from("payments")
          .update({
            provider_status: charge.status,
            refund_id: charge.refunds?.data?.[0]?.id ?? null
          })
          .eq("id", payment.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
