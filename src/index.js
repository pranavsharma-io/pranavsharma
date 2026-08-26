/**
 * Contact form worker.
 * POST /contact  -> validates + saves to D1
 * Anything else  -> 404
 *
 * Set ALLOWED_ORIGIN in wrangler.toml (or as a secret) to your site's
 * origin, e.g. "https://pranavsharma.dev", so only your site can post here.
 */

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || "*";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname !== "/contact" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin);
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    // Basic validation
    if (!name || !email || !message) {
      return json({ error: "name, email and message are all required" }, 400, origin);
    }
    if (name.length > 200 || email.length > 200) {
      return json({ error: "name/email too long" }, 400, origin);
    }
    if (message.length > 5000) {
      return json({ error: "message too long (max 5000 chars)" }, 400, origin);
    }
    if (!EMAIL_RE.test(email)) {
      return json({ error: "invalid email address" }, 400, origin);
    }

    // Honeypot: if the form includes a hidden "website" field and it's
    // filled in, silently pretend success (it's almost certainly a bot).
    if (body.website) {
      return json({ ok: true }, 200, origin);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";

    try {
      await env.DB.prepare(
        "INSERT INTO submissions (name, email, message, ip) VALUES (?1, ?2, ?3, ?4)"
      )
        .bind(name, email, message, ip)
        .run();
    } catch (err) {
      console.error("D1 insert failed:", err);
      return json({ error: "Could not save your message, try again later" }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
