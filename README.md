# Vector (fracta-flow-vector)

Practical behaviour support forms for Australia. Public launch exposes three free forms; Vector Paid unlocks export, organisation branding, and Support Templates.

## Public forms (free)

| Route | Form |
|---|---|
| `/referral` | Referral |
| `/practitioner-triage` | Practitioner Triage |
| `/source-consultation-register` | Source & Consultation Register |

Production: https://vector.whatbit.dev

Marketing entry: https://whatbit.dev/vector

## Development

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
pnpm --filter @pbs/ui run dev
```

Open http://localhost:43123/referral

## Verify

```bash
pnpm test
pnpm typecheck
node packages/registry/src/validate.mjs
pnpm build
```

## Deploy

1. Create/bind Cloudflare D1 `vector-commercial` and set `database_id` in `wrangler.jsonc`.
2. Apply migration: `pnpm exec wrangler d1 migrations apply vector-commercial --remote`
3. Set Worker secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID`
4. `pnpm deploy`

## Architecture notes

- Clinical form content stays client-side; only commercial metadata hits the Worker/D1.
- Paid entitlement requires active/trialing subscription **and** exact `STRIPE_PRICE_ID`.
- Document 04 and Documents 05–09 remain in-repo for internal history but are not public.

See `docs/stripe-billing.md`, `PROJECT_STATUS.md`, and `ONBOARDING.md`.
