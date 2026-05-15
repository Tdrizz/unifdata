# UnifData SaaS Auth and Billing Setup

## Install

```bash
npm install
npm run build
```

## Supabase

Run `database/008_saas_auth_billing_waitlist.sql` after the existing migrations.

The migration:

- adds Clerk mapping columns to `profiles`
- keeps existing UUID membership relationships intact
- creates `waitlist_requests`
- creates `stripe_events` for webhook idempotency

Set these variables in local `.env.local` and Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Clerk

Create a Clerk application and set:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Dashboard configuration:

- Disable public/self-serve signups.
- Keep email/password or preferred enterprise sign-in methods enabled.
- Create users through Clerk invitations for approved pilot customers.
- Use `/sign-in` and `/sign-up` as the app sign-in and sign-up URLs.
- Use `/pricing` as the post-sign-up URL for invited users.

Subscription state is stored in Clerk user public metadata:

```json
{ "subscribed": true }
```

The Stripe webhook toggles this value.

## Stripe

Create one recurring monthly Price and set:

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

Webhook endpoint:

```txt
https://YOUR_DOMAIN/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Local webhook test:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` value to `STRIPE_WEBHOOK_SECRET`.

## Vercel

Add every variable from `.env.example` to the Vercel project. Make sure
`NEXT_PUBLIC_APP_URL` is the production URL with no trailing slash.

After deployment, create the Stripe webhook against the production Vercel URL
and send a test event from Stripe.
