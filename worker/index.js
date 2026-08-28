function json(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

const ANONYMOUS_ENTITLEMENTS = Object.freeze({
  plan: "free",
  exportDocuments: false,
  companyBranding: false,
  supportTemplates: false,
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "vector" });
    }

    // Until account authentication is connected, every anonymous visitor
    // receives the real free-tier entitlement set. Paid state must later be
    // resolved server-side from the authenticated account + subscription,
    // never from a client-controlled flag.
    if (url.pathname === "/api/entitlements" && request.method === "GET") {
      return json({ entitlements: ANONYMOUS_ENTITLEMENTS, source: "anonymous" });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
