type EnvName =
  | "CLERK_SECRET_KEY"
  | "MAILGUN_API_KEY"
  | "MAILGUN_DOMAIN"
  | "MAILGUN_WEBHOOK_SIGNING_KEY"
  | "QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN"
  | "REDIS_URL"
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "STRIPE_PRICE_ID"
  | "STRIPE_PRICE_ID_SETUP"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "TWILIO_ACCOUNT_SID"
  | "TWILIO_AUTH_TOKEN"
  | "TWILIO_PHONE_NUMBER";

export function getEnv(name: EnvName) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}
