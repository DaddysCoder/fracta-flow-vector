import { entitlementsForSubscription, isVectorPaidSubscription } from "./entitlements.mjs";

function json(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

const FREE_ENTITLEMENTS = Object.freeze({
  plan: "free",
  exportDocuments: false,
  companyBranding: false,
  supportTemplates: false,
});

const PAID_ENTITLEMENTS = Object.freeze({
  plan: "paid",
  exportDocuments: true,
  companyBranding: true,
  supportTemplates: true,
});

const SESSION_COOKIE = "vector_account";
const STRIPE_API = "https://api.stripe.com/v1";

const BRAND_PROFILE_FIELDS = [
  "organisationName",
  "accentHex",
  "inkHex",
  "paperHex",
  "contactLine",
  "footerText",
];

function parseCookies(request) {
  const raw = request.headers.get("cookie") ?? "";
  const cookies = new Map();
  for (const item of raw.split(";")) {
    const [name, ...rest] = item.trim().split("=");
    if (!name) continue;
    cookies.set(name, decodeURIComponent(rest.join("=")));
  }
  return cookies;
}

function accountIdFromRequest(request) {
  return parseCookies(request).get(SESSION_COOKIE) ?? null;
}

function sessionCookie(accountId) {
  return `${SESSION_COOKIE}=${encodeURIComponent(accountId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
}

function requireBillingConfig(env, { webhook = false, portal = false } = {}) {
  const missing = [];
  if (!env.DB) missing.push("DB");
  if (!env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!webhook && !portal && !env.STRIPE_PRICE_ID) missing.push("STRIPE_PRICE_ID");
  if (webhook && !env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (portal && !env.STRIPE_PORTAL_CONFIGURATION_ID) missing.push("STRIPE_PORTAL_CONFIGURATION_ID");
  return missing;
}

async function stripeRequest(env, path, params) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message ?? "Stripe request failed";
    throw new Error(message);
  }
  return payload;
}

async function getAccountSubscription(env, accountId) {
  if (!env.DB || !accountId) return null;
  return env.DB.prepare(
    `SELECT account_id, provider_customer_id, provider_subscription_id, provider_price_id,
            status, current_period_end, cancel_at_period_end
       FROM subscriptions
      WHERE account_id = ?1`,
  )
    .bind(accountId)
    .first();
}

async function currentEntitlements(env, accountId) {
  const subscription = await getAccountSubscription(env, accountId);
  return {
    entitlements: entitlementsForSubscription(
      subscription,
      env.STRIPE_PRICE_ID,
      FREE_ENTITLEMENTS,
      PAID_ENTITLEMENTS,
    ),
    subscription: subscription
      ? {
          status: subscription.status,
          priceId: subscription.provider_price_id,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        }
      : null,
  };
}

async function createCheckout(request, env) {
  const missing = requireBillingConfig(env);
  if (missing.length) return json({ error: "billing_not_configured", missing }, { status: 503 });

  let accountId = accountIdFromRequest(request);
  if (!accountId) accountId = crypto.randomUUID();

  const existing = await getAccountSubscription(env, accountId);
  if (isVectorPaidSubscription(existing, env.STRIPE_PRICE_ID)) {
    return json({ error: "already_paid" }, { status: 409 });
  }

  await env.DB.prepare(
    `INSERT OR IGNORE INTO accounts (id, email, created_at, updated_at)
     VALUES (?1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  )
    .bind(accountId)
    .run();

  const origin = new URL(request.url).origin;
  const session = await stripeRequest(env, "/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/?billing=success`,
    cancel_url: `${origin}/?billing=cancelled`,
    client_reference_id: accountId,
    "metadata[account_id]": accountId,
    "subscription_data[metadata][account_id]": accountId,
  });

  return json(
    { url: session.url, checkoutSessionId: session.id },
    { headers: { "set-cookie": sessionCookie(accountId) } },
  );
}

async function createPortal(request, env) {
  const missing = requireBillingConfig(env, { portal: true });
  if (missing.length) return json({ error: "billing_not_configured", missing }, { status: 503 });

  const accountId = accountIdFromRequest(request);
  const subscription = await getAccountSubscription(env, accountId);
  if (!subscription?.provider_customer_id) {
    return json({ error: "billing_customer_not_found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const portal = await stripeRequest(env, "/billing_portal/sessions", {
    customer: subscription.provider_customer_id,
    configuration: env.STRIPE_PORTAL_CONFIGURATION_ID,
    return_url: origin,
  });
  return json({ url: portal.url });
}

function parseStripeSignature(header) {
  const parts = (header ?? "").split(",");
  let timestamp = null;
  const signatures = [];
  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  return { timestamp, signatures };
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(payload, header, secret) {
  const { timestamp, signatures } = parseStripeSignature(header);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = toHex(signature);
  return signatures.some((candidate) => constantTimeEqual(candidate, expected));
}

function subscriptionValues(subscription) {
  const firstItem = subscription.items?.data?.[0];
  const periodEnd = subscription.current_period_end ?? firstItem?.current_period_end ?? null;
  return {
    accountId: subscription.metadata?.account_id ?? null,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    subscriptionId: subscription.id,
    priceId: firstItem?.price?.id ?? null,
    status: subscription.status ?? "inactive",
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
  };
}

async function upsertSubscription(env, subscription) {
  const values = subscriptionValues(subscription);
  if (!values.accountId) return;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO accounts (id, email, created_at, updated_at)
     VALUES (?1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  )
    .bind(values.accountId)
    .run();

  await env.DB.prepare(
    `INSERT INTO subscriptions (
        account_id, provider, provider_customer_id, provider_subscription_id,
        provider_price_id, status, current_period_end, cancel_at_period_end,
        created_at, updated_at
      ) VALUES (?1, 'stripe', ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id) DO UPDATE SET
        provider_customer_id = excluded.provider_customer_id,
        provider_subscription_id = excluded.provider_subscription_id,
        provider_price_id = excluded.provider_price_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(
      values.accountId,
      values.customerId,
      values.subscriptionId,
      values.priceId,
      values.status,
      values.currentPeriodEnd,
      values.cancelAtPeriodEnd,
    )
    .run();
}

async function handleCheckoutCompleted(env, session) {
  const accountId = session.metadata?.account_id ?? session.client_reference_id ?? null;
  if (!accountId) return;

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  await env.DB.prepare(
    `INSERT INTO accounts (id, email, created_at, updated_at)
     VALUES (?1, ?2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       email = COALESCE(excluded.email, accounts.email),
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(accountId, email)
    .run();
}

async function handleWebhook(request, env) {
  const missing = requireBillingConfig(env, { webhook: true });
  if (missing.length) return json({ error: "billing_not_configured", missing }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!(await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const alreadyProcessed = await env.DB.prepare(
    "SELECT provider_event_id FROM billing_events WHERE provider_event_id = ?1",
  )
    .bind(event.id)
    .first();
  if (alreadyProcessed) return json({ received: true, duplicate: true });

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(env, event.data.object);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await upsertSubscription(env, event.data.object);
  }

  await env.DB.prepare(
    `INSERT INTO billing_events (id, provider_event_id, event_type, processed_at)
     VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)`,
  )
    .bind(crypto.randomUUID(), event.id, event.type)
    .run();

  return json({ received: true });
}

function sanitizeBrandField(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}

function brandRowToProfile(row) {
  if (!row) return null;
  return {
    organisationName: row.organisation_name,
    accentHex: row.accent_hex,
    inkHex: row.ink_hex,
    paperHex: row.paper_hex,
    contactLine: row.contact_line,
    footerText: row.footer_text,
  };
}

async function getBrandProfile(env, accountId) {
  const row = await env.DB.prepare(
    `SELECT organisation_name, accent_hex, ink_hex, paper_hex, contact_line, footer_text
       FROM brand_profiles
      WHERE account_id = ?1`,
  )
    .bind(accountId)
    .first();
  return brandRowToProfile(row);
}

async function saveBrandProfile(env, accountId, body) {
  const organisationName = sanitizeBrandField(body.organisationName);
  if (!organisationName) {
    return { error: "organisation_name_required" };
  }

  await env.DB.prepare(
    `INSERT INTO brand_profiles (
        account_id, organisation_name, accent_hex, ink_hex, paper_hex,
        contact_line, footer_text, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(account_id) DO UPDATE SET
        organisation_name = excluded.organisation_name,
        accent_hex = excluded.accent_hex,
        ink_hex = excluded.ink_hex,
        paper_hex = excluded.paper_hex,
        contact_line = excluded.contact_line,
        footer_text = excluded.footer_text,
        updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(
      accountId,
      organisationName,
      sanitizeBrandField(body.accentHex),
      sanitizeBrandField(body.inkHex),
      sanitizeBrandField(body.paperHex),
      sanitizeBrandField(body.contactLine),
      sanitizeBrandField(body.footerText),
    )
    .run();

  return { profile: await getBrandProfile(env, accountId) };
}

async function requireVectorPaidAccount(request, env) {
  const missing = requireBillingConfig(env);
  if (missing.length) return { response: json({ error: "billing_not_configured", missing }, { status: 503 }) };

  const accountId = accountIdFromRequest(request);
  if (!accountId) return { response: json({ error: "account_required" }, { status: 401 }) };

  const subscription = await getAccountSubscription(env, accountId);
  if (!isVectorPaidSubscription(subscription, env.STRIPE_PRICE_ID)) {
    return { response: json({ error: "paid_required" }, { status: 403 }) };
  }

  return { accountId };
}

async function handleBrandProfile(request, env) {
  const auth = await requireVectorPaidAccount(request, env);
  if (auth.response) return auth.response;

  if (request.method === "GET") {
    const profile = await getBrandProfile(env, auth.accountId);
    return json({ profile });
  }

  if (request.method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_body" }, { status: 400 });
    }
    const unknownKeys = Object.keys(body).filter((key) => !BRAND_PROFILE_FIELDS.includes(key));
    if (unknownKeys.length > 0) {
      return json({ error: "unknown_fields", fields: unknownKeys }, { status: 400 });
    }

    const result = await saveBrandProfile(env, auth.accountId, body);
    if (result.error) return json({ error: result.error }, { status: 400 });
    return json(result);
  }

  return json({ error: "method_not_allowed" }, { status: 405 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          service: "vector",
          billingConfigured: requireBillingConfig(env).length === 0,
        });
      }

      if (url.pathname === "/api/entitlements" && request.method === "GET") {
        const accountId = accountIdFromRequest(request);
        const state = await currentEntitlements(env, accountId);
        return json({ ...state, source: accountId ? "session" : "anonymous" });
      }

      if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
        return await createCheckout(request, env);
      }

      if (url.pathname === "/api/billing/portal" && request.method === "POST") {
        return await createPortal(request, env);
      }

      if (url.pathname === "/api/billing/webhook" && request.method === "POST") {
        return await handleWebhook(request, env);
      }

      if (url.pathname === "/api/brand-profile") {
        return await handleBrandProfile(request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return json({ error: "not_found" }, { status: 404 });
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "internal_error" }, { status: 500 });
    }
  },
};
