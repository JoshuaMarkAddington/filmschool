// Worker entry point. Static assets (index.html, apply.html, success.html, …)
// are served by the ASSETS binding; this script only handles /api/* routes
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply" && request.method === "POST") {
      return handleApply(request, env);
    }
    if (url.pathname === "/api/stripe-webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleApply(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required = ["studentName", "guardianName", "email", "selectedPlan"];
  for (const field of required) {
    if (!body[field]) {
      return Response.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }
  if (!body.selectedPlan?.type || !body.selectedPlan?.months) {
    return Response.json({ error: "Missing selectedPlan.type/months" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO applications (
      id, plan_type, plan_months, student_name, student_dob,
      month1, month2, month3, new_to_film,
      guardian_name, guardian_dob,
      address_line1, address_line2, city, county, postcode,
      email, phone,
      emergency_same, emergency_name, emergency_phone, emergency_relation,
      allergies, allergies_detail,
      additional_needs, additional_needs_detail,
      health_issues, health_issues_detail,
      consent_filming, consent_policy,
      stripe_client_reference_id
    ) VALUES (?,?,?,?,?, ?,?,?,?, ?,?, ?,?,?,?,?, ?,?, ?,?,?,?, ?,?, ?,?, ?,?, ?,?, ?)
  `).bind(
    id, body.selectedPlan.type, body.selectedPlan.months, body.studentName, body.studentDob || null,
    body.month1 || null, body.month2 || null, body.month3 || null, body.newToFilm ? 1 : 0,
    body.guardianName, body.guardianDob || null,
    body.addressLine1 || null, body.addressLine2 || null, body.city || null, body.county || null, body.postcode || null,
    body.email, body.phone || null,
    body.emergencySame ? 1 : 0, body.emergencyName || null, body.emergencyPhone || null, body.emergencyRelation || null,
    body.allergies ? 1 : 0, body.allergiesDetail || null,
    body.additionalNeeds ? 1 : 0, body.additionalNeedsDetail || null,
    body.healthIssues ? 1 : 0, body.healthIssuesDetail || null,
    body.consentFilming ? 1 : 0, body.consentPolicy ? 1 : 0,
    id
  ).run();

  return Response.json({ id });
}

// Stripe sends a `Stripe-Signature` header of the form `t=<timestamp>,v1=<hex hmac>[,v0=...]`.
// We verify it ourselves (HMAC-SHA256 over `${timestamp}.${rawBody}`) rather than pulling in
// the full Stripe SDK, since this only needs to check one header on the Workers edge.
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map(p => p.split("=").map(s => s.trim()))
  );
  if (!parts.t || !parts.v1) return false;

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

async function handleStripeWebhook(request, env) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook not configured", { status: 500 });
  }
  if (!(await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.client_reference_id) {
      await env.DB.prepare(
        "UPDATE applications SET status = 'paid' WHERE id = ?"
      ).bind(session.client_reference_id).run();
    }
  }

  return Response.json({ received: true });
}
