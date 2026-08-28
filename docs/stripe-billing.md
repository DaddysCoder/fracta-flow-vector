# Vector billing setup

Vector uses one freemium product model:

- Free: use the three launch forms online.
- Paid: document export, Print/PDF, organisation branding, saved brand profile, and support templates.

## Stripe

Live Stripe product:

- Product: `Vector`
- Product ID: `prod_V9bnI1AvbEr9nO`
- Account: WhatBit

The recurring price is deliberately not hard-coded in the app. `STRIPE_PRICE_ID` selects the one paid Vector subscription price.

### Checkout

`POST /api/billing/checkout`

The Worker creates a Stripe-hosted Checkout Session with:

- `mode=subscription`
- one `STRIPE_PRICE_ID` line item
- a server-generated Vector account ID in `client_reference_id`
- the same account ID in Checkout and subscription metadata
- success/cancel redirects back to Vector

The account ID is stored in a Secure, HttpOnly, SameSite=Lax cookie. Until full sign-in is added, paid access is therefore bound to that browser session rather than to email alone. This is intentional: an email address by itself must never be accepted as proof that somebody owns a paid account.

### Webhook

Endpoint:

`POST /api/billing/webhook`

Configure Stripe to send at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The Worker verifies `Stripe-Signature` against the exact raw request body and `STRIPE_WEBHOOK_SECRET`, then stores subscription state in D1. Browser-provided paid flags are never trusted.

### Customer portal

`POST /api/billing/portal`

Creates a Stripe Billing Portal session for the Stripe customer stored against the current Vector account. The WhatBit live Stripe account already has an active default customer portal configuration.

## Cloudflare bindings and secrets

Create a D1 database and bind it as `DB` in `wrangler.jsonc`, then apply `migrations/0001_commercial.sql`.

Required Worker values:

- `STRIPE_SECRET_KEY` — secret
- `STRIPE_WEBHOOK_SECRET` — secret
- `STRIPE_PRICE_ID` — the live recurring Vector price ID
- `DB` — D1 binding
- `ASSETS` — configured by Wrangler static assets

Do not commit Stripe secret keys or webhook secrets.

## Remaining launch actions

1. Choose the recurring Vector price amount/cadence.
2. Create that Stripe Price under `prod_V9bnI1AvbEr9nO` and set `STRIPE_PRICE_ID`.
3. Create/bind the Cloudflare D1 database and run the migration.
4. Set the Stripe secret key in the Worker.
5. Deploy Vector to its final Cloudflare URL.
6. Create the Stripe webhook endpoint against `<final-vector-url>/api/billing/webhook` and set its signing secret in the Worker.
7. Run one live low-value checkout and cancellation test before public launch.

The Arc support-template content can be added later without changing the billing model; `supportTemplates` is already a paid entitlement.
