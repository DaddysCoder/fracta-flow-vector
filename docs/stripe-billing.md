# Vector billing setup

Vector uses one freemium product model with three purchasable tiers:

- Free: use the three launch forms online.
- Paid: document export, Print/PDF, organisation branding, saved brand profile, and support templates.
  Unlocked by any of:
  - **Monthly** subscription (`STRIPE_PRICE_ID`)
  - **Annual** subscription, "2 months free" (`STRIPE_YEARLY_PRICE_ID`)
  - **One-off**, a single document credit with no subscription (`STRIPE_SINGLE_DOCUMENT_PRICE_ID`) — a
    one-time Stripe Checkout payment that grants one row in `document_credits`, spent via
    `POST /api/document-credit/consume`.

## Stripe

Live Stripe product:

- Product: `Vector`
- Product ID: `prod_V9bnI1AvbEr9nO`
- Account: WhatBit

None of the three prices are hard-coded in the app — `POST /api/billing/checkout` takes a `purchase`
field (`"monthly" | "yearly" | "single_document"`) and looks up the matching price id.

### Checkout

`POST /api/billing/checkout`

The Worker creates a Stripe-hosted Checkout Session with:

- `mode=subscription` for `monthly`/`yearly`, `mode=payment` for `single_document`
- one line item, priced from `STRIPE_PRICE_ID` / `STRIPE_YEARLY_PRICE_ID` / `STRIPE_SINGLE_DOCUMENT_PRICE_ID`
- a server-generated Vector account ID in `client_reference_id`
- the same account ID, plus the `purchase` tier, in Checkout (and subscription) metadata
- success/cancel redirects back to Vector

The account ID is stored in a Secure, HttpOnly, SameSite=Lax cookie. Until full sign-in is added, paid access is therefore bound to that browser session rather than to email alone. This is intentional: an email address by itself must never be accepted as proof that somebody owns a paid account.

### One-off document credits

`checkout.session.completed` for a `mode=payment` session with `metadata.purchase = "single_document"`
grants one row in `document_credits` (`+1` balance) rather than a subscription. The client spends it via
`POST /api/document-credit/consume`, which decrements atomically and never goes below zero.

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

Create a D1 database and bind it as `DB` in `wrangler.jsonc`, then apply `migrations/0001_commercial.sql`,
`migrations/0002_document_credits.sql` and `migrations/0003_brand_heading_font.sql` in order.

Required Worker values:

- `STRIPE_SECRET_KEY` — secret
- `STRIPE_WEBHOOK_SECRET` — secret
- `STRIPE_PRICE_ID` — the live monthly Vector subscription price ID
- `STRIPE_YEARLY_PRICE_ID` — the live annual Vector subscription price ID
- `STRIPE_SINGLE_DOCUMENT_PRICE_ID` — the live one-off document price ID (`mode=payment`, not a subscription)
- `STRIPE_PORTAL_CONFIGURATION_ID` — dedicated Vector portal configuration
- `DB` — D1 binding
- `VECTOR_LOGOS` — R2 binding for Brand Profile organisation logos (see below)
- `ASSETS` — configured by Wrangler static assets

Do not commit Stripe secret keys or webhook secrets.

### Brand Profile logo storage (R2)

Organisation logos are stored in R2, never as base64 in D1 — `brand_profiles.logo_r2_key` just holds
the object key. `wrangler.jsonc` already declares the binding:

```jsonc
"r2_buckets": [{ "binding": "VECTOR_LOGOS", "bucket_name": "vector-organisation-logos" }]
```

**R2 must be enabled on the Cloudflare account once, from the dashboard** (Cloudflare gates the
product behind a one-time opt-in — accounts without it return `10042 Please enable R2 through the
Cloudflare Dashboard` on every R2 API call, including bucket creation). This cannot be done via the API
or `wrangler` CLI; it's a manual dashboard action. Once enabled, create the bucket with:

```
npx wrangler r2 bucket create vector-organisation-logos
```

(or via the dashboard) before the first deploy that references the binding — `wrangler deploy` fails
validation if the bound bucket doesn't exist yet.

`PUT /api/brand-profile/logo` (paid-account-gated, same as the rest of Brand Profile) accepts a raw
`image/png` or `image/jpeg` body up to 2 MB, stores it at a stable per-account key
(`brand-logos/<accountId>`, never a client-supplied filename), and records that key in
`brand_profiles.logo_r2_key`. Replacing a logo overwrites the same object. `GET
/api/brand-profile/logo` streams it back with the content type recorded on the R2 object. DOCX export
and the print letterhead both fetch this endpoint client-side and embed the bytes directly — no second
storage system, no base64 round-trip through D1.

## Remaining launch actions

1. Choose the Vector price amounts/cadence for all three tiers (monthly, annual, one-off).
2. Create those three Stripe Prices under `prod_V9bnI1AvbEr9nO` and set `STRIPE_PRICE_ID`,
   `STRIPE_YEARLY_PRICE_ID` and `STRIPE_SINGLE_DOCUMENT_PRICE_ID`.
3. Create the dedicated Vector Billing Portal configuration and set `STRIPE_PORTAL_CONFIGURATION_ID`.
4. Create/bind the Cloudflare D1 database and run the migrations.
5. Enable R2 on the Cloudflare account (dashboard, one-time) and create the `vector-organisation-logos`
   bucket, then bind it as `VECTOR_LOGOS`.
6. Set the Stripe secret key in the Worker.
7. Deploy Vector to its final Cloudflare URL.
8. Create the Stripe webhook endpoint against `<final-vector-url>/api/billing/webhook` and set its signing secret in the Worker.
9. Run one live low-value checkout and cancellation test per tier before public launch.

The Arc support-template content can be added later without changing the billing model; `supportTemplates` is already a paid entitlement.
