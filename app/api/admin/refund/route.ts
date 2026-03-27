import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const refundSchema = z.object({
  orderId: z.string(),
  paymentIntentId: z.string()
});

export async function POST(request: Request) {
  await requireAdmin();
  const stripe = getStripe();
  // The generated Database type is not complete enough for typed updates yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any;

  if (!stripe || !supabase) {
    return NextResponse.json({ error: "Stripe não configurado." }, { status: 500 });
  }

  const payload = refundSchema.parse(await request.json());
  const refund = await stripe.refunds.create({
    payment_intent: payload.paymentIntentId
  });

  await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", payload.orderId);

  await supabase
    .from("payments")
    .update({
      provider_status: "refunded",
      refund_id: refund.id
    })
    .eq("order_id", payload.orderId);

  return NextResponse.json({ refundId: refund.id });
}
