const getValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

export const env = {
  supabaseUrl: getValue("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
  supabaseAnonKey: getValue(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY"
  ),
  supabaseServiceRoleKey: getValue("SUPABASE_SERVICE_ROLE_KEY"),
  stripePublishableKey: getValue("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  stripeSecretKey: getValue("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: getValue("STRIPE_WEBHOOK_SECRET_LIVE"),
  siteUrl: getValue("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000",
  whatsappNumber: getValue("NEXT_PUBLIC_WHATSAPP_NUMBER") || "5521988681799",
  formSubmitSenderEmail: getValue("FORMSUBMIT_SENDER_EMAIL"),
  formSubmitAccessToken: getValue("FORMSUBMIT_ACCESS_TOKEN"),
  formSubmitEndpoint:
    getValue("FORMSUBMIT_ENDPOINT") || "https://formsubmit.co/el/tumohu"
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasServiceRole() {
  return hasSupabaseEnv() && Boolean(env.supabaseServiceRoleKey);
}

export function hasStripeEnv() {
  return Boolean(env.stripePublishableKey && env.stripeSecretKey);
}

export function hasFormSubmitEnv() {
  return Boolean(
    env.formSubmitSenderEmail && (env.formSubmitEndpoint || env.formSubmitAccessToken)
  );
}
