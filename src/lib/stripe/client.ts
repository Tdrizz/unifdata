import Stripe from "stripe";
import { getEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripe() {
  stripeClient ??= new Stripe(getEnv("STRIPE_SECRET_KEY"));
  return stripeClient;
}
