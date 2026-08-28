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

Vector requires its own Stripe Billing Portal configuration via `STRIPE_PORTAL_CONFIGURATION_ID`. Do not use the WhatBit account-wide default configuration for Vector, because the default configuration can allow subscription price changes and WhatBit has other products. The Vector portal should allow payment-method/customer-detail updates and cancellation at period end, but should not expose unrelated product/price switching.

## Cloudflare bindings and secrets

Create a D1 database and bind it as `DB` in `wrangler.jsonc`, then apply `migrations/0001_commercial.sql`.

Required Worker values:

- `STRIPE_SECRET_KEY` — secret
- `STRIPE_WEBHOOK_SECRET` — secret
- `STRIPE_PRICE_ID` — the live recurring Vector price ID
- `STRIPE_PORTAL_CONFIGURATION_ID` — dedicated Vector portal configuration
- `DB` — D1 binding
- `ASSETS` — configured by Wrangler static assets

Do not commit Stripe secret keys or webhook secrets.

## Remaining launch actions

1. Choose the recurring Vector price amount/cadence.
2. Create that Stripe Price under `prod_V9bnI1AvbEr9nO` and set `STRIPE_PRICE_ID`.
3. Create the dedicated Vector Billing Portal configuration and set `STRIPE_PORTAL_CONFIGURATION_ID`.
4. Create/bind the Cloudflare D1 database and run the migration.
5. Set the Stripe secret key in the Worker.
6. Deploy Vector to its final Cloudflare URL.
7. Create the Stripe webhook endpoint against `<final-vector-url>/api/billing/webhook` and set its signing secret in the Worker.
8. Run one live low-value checkout and cancellation test before public launch.

The Arc support-template content can be added later without changing the billing model; `supportTemplates` is already a paid entitlement.
