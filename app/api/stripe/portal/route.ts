import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST() {
  const user = await getCurrentUser();
  const stripe = getStripe();
  // The generated Database type is not complete enough for typed reads here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any;

  if (!user) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
  }

  if (!stripe || !supabase) {
    return NextResponse.json({ error: "Stripe não configurado." }, { status: 500 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Nenhum cliente Stripe encontrado para esta conta." },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: `${env.siteUrl}/account`
  });

  return NextResponse.json({ url: session.url });
}
