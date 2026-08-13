// Worker entry point. Static assets (index.html, apply.html, success.html, …)
// are served by the ASSETS binding; this script only handles /api/* routes
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply" && request.method === "POST") {
      return handleApply(request, env);
    }
    if (url.pathname === "/api/audition" && request.method === "POST") {
      return handleAudition(request, env);
    }
    if (url.pathname === "/api/stripe/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      return handleAdminLogin(request, env);
    }
    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
      return handleAdminLogout();
    }
    if (url.pathname === "/api/admin/applications" && request.method === "GET") {
      return handleAdminApplications(request, env);
    }
    if (url.pathname === "/api/admin/auditions" && request.method === "GET") {
      return handleAdminAuditions(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

function ageInYears(dob) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

// Membership applications: open to students aged 13–17.
function isEligibleAge(dob) {
  const age = ageInYears(dob);
  return age !== null && age >= 13 && age <= 17;
}

// Two-week intensive-course auditions: open to performers aged 13–24.
function isEligibleAuditionAge(dob) {
  const age = ageInYears(dob);
  return age !== null && age >= 13 && age <= 24;
}

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
  if (!isEligibleAge(body.studentDob)) {
    return Response.json({ error: "Student must be between 13 and 17 years old" }, { status: 400 });
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

  // Email notifications are best-effort — a failure here must never block
  // the applicant from reaching Stripe checkout.
  try {
    await sendApplicationReceivedEmails(env, { ...body, id }, new URL(request.url).origin);
  } catch (err) {
    console.error("application email failed", err);
  }

  return Response.json({ id });
}

/* ===========================================================================
   INTENSIVE-COURSE AUDITION SIGN-UP — mirrors handleApply but writes to the
   separate `auditions` table. The sign-up is for the £25 audition only; the
   £100 course fee is handled separately for students offered a place.
   =========================================================================== */
async function handleAudition(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required = ["studentName", "guardianName", "email", "discipline"];
  for (const field of required) {
    if (!body[field]) {
      return Response.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }
  const ALLOWED_DISCIPLINES = ["Dance", "Singing", "Dancing & Singing", "Acting"];
  if (!ALLOWED_DISCIPLINES.includes(body.discipline)) {
    return Response.json({ error: "Invalid discipline" }, { status: 400 });
  }
  if (!isEligibleAuditionAge(body.studentDob)) {
    return Response.json({ error: "Student must be between 13 and 24 years old" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO auditions (
      id, discipline, student_name, student_dob, new_to_performing,
      guardian_name, guardian_dob,
      address_line1, address_line2, city, county, postcode,
      email, phone,
      emergency_same, emergency_name, emergency_phone, emergency_relation,
      allergies, allergies_detail,
      additional_needs, additional_needs_detail,
      health_issues, health_issues_detail,
      consent_filming, consent_policy,
      stripe_client_reference_id
    ) VALUES (?,?,?,?,?, ?,?, ?,?,?,?,?, ?,?, ?,?,?,?, ?,?, ?,?, ?,?, ?,?, ?)
  `).bind(
    id, body.discipline, body.studentName, body.studentDob || null, body.newToPerforming ? 1 : 0,
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

  // Email notifications are best-effort — a failure here must never block
  // the applicant from reaching Stripe checkout.
  try {
    await sendAuditionReceivedEmails(env, { ...body, id }, new URL(request.url).origin);
  } catch (err) {
    console.error("audition email failed", err);
  }

  return Response.json({ id });
}

async function sendAuditionReceivedEmails(env, app, origin) {
  await sendEmail(env, {
    to: app.email,
    subject: "Your Adders Film School audition sign-up",
    html: `
      <p>Hi ${escapeHtml(app.guardianName)},</p>
      <p>Thanks for signing <b>${escapeHtml(app.studentName)}</b> up to audition for our two-week
      intensive course.</p>
      <p>Audition strand: <b>${escapeHtml(app.discipline)}</b></p>
      <p>We're sending over our <a href="${origin}/policy.pdf">policy document</a> for your reference. If you have any
      questions at all, please feel free to get in touch with us.</p>
      <p>You're about to be taken to Stripe to pay the £25 audition fee securely. If ${escapeHtml(app.studentName)}
      is offered a place, the £100 course fee is payable separately.</p>
      <p>— Adders Film School</p>
    `,
  });

  if (env.ADMIN_NOTIFY_EMAIL) {
    await sendEmail(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: `New audition sign-up: ${app.studentName}`,
      html: `
        <p>A new intensive-course audition sign-up was submitted (payment not yet confirmed).</p>
        <ul>
          <li><b>Student:</b> ${escapeHtml(app.studentName)} (DOB ${escapeHtml(app.studentDob)})</li>
          <li><b>Auditioning for:</b> ${escapeHtml(app.discipline)}</li>
          <li><b>Guardian:</b> ${escapeHtml(app.guardianName)}</li>
          <li><b>Email:</b> ${escapeHtml(app.email)}</li>
          <li><b>Phone:</b> ${escapeHtml(app.phone)}</li>
        </ul>
        <p>View full details (medical/emergency info, address) in the admin dashboard at /admin.</p>
      `,
    });
  }
}

/* ===========================================================================
   STRIPE WEBHOOK — confirms a payment actually completed and flips the
   application's status, rather than trusting the client-side redirect.
   =========================================================================== */
async function handleStripeWebhook(request, env) {
  const payload = await request.text();
  const sigHeader = request.headers.get("Stripe-Signature") || "";

  const ok = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!ok) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object || {};
    const appId = session.client_reference_id;
    if (appId) {
      // The client_reference_id may belong to a membership application or an
      // intensive-course audition. Try the applications table first; if no row
      // matched, treat it as an audition.
      const appUpdate = await env.DB.prepare(
        `UPDATE applications SET status = 'paid' WHERE id = ?`
      ).bind(appId).run();

      if (appUpdate.meta?.changes) {
        const { results } = await env.DB.prepare(`SELECT * FROM applications WHERE id = ?`).bind(appId).all();
        const application = results?.[0];
        if (application) {
          try {
            await sendPaymentConfirmedEmails(env, application, new URL(request.url).origin);
          } catch (err) {
            console.error("payment confirmation email failed", err);
          }
        }
      } else {
        await env.DB.prepare(`UPDATE auditions SET status = 'paid' WHERE id = ?`).bind(appId).run();

        const { results } = await env.DB.prepare(`SELECT * FROM auditions WHERE id = ?`).bind(appId).all();
        const audition = results?.[0];
        if (audition) {
          try {
            await sendAuditionConfirmedEmails(env, audition, new URL(request.url).origin);
          } catch (err) {
            console.error("audition confirmation email failed", err);
          }
        }
      }
    }
  }

  return Response.json({ received: true });
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!secret || !sigHeader) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  // Reject events older than 5 minutes to limit replay-attack exposure.
  const age = Date.now() / 1000 - Number(timestamp);
  if (!Number.isFinite(age) || age > 300 || age < -300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const computedSig = await hmacSha256Hex(secret, signedPayload);
  return timingSafeEqual(computedSig, expectedSig);
}

/* ===========================================================================
   EMAIL — Resend. Two emails fire on application submission (to the
   applicant, and to the school so you immediately know someone signed up),
   then a payment-confirmed pair once Stripe confirms the charge.
   =========================================================================== */
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    console.error("Resend is not configured (RESEND_API_KEY / RESEND_FROM missing)");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Resend send failed", res.status, await res.text());
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function modulesSummary(a) {
  return [a.month1, a.month2, a.month3].filter(Boolean).map(escapeHtml).join(" → ") || "—";
}

async function sendApplicationReceivedEmails(env, app, origin) {
  const planLabel = `${app.selectedPlan.type} · ${app.selectedPlan.months} months`;

  await sendEmail(env, {
    to: app.email,
    subject: "Your Adders Film School policy document",
    html: `
      <p>Hi ${escapeHtml(app.guardianName)},</p>
      <p>Thanks for applying to Adders Film School on behalf of <b>${escapeHtml(app.studentName)}</b>.</p>
      <p>We're sending over our <a href="${origin}/policy.pdf">policy document</a> for your reference. If you have any questions
      at all, please feel free to get in touch with us.</p>
      <p>Modules selected: <b>${modulesSummary(app)}</b><br/>
      Plan: <b>${escapeHtml(planLabel)}</b></p>
      <p>You're about to be taken to Stripe to complete payment securely.</p>
      <p>— Adders Film School</p>
    `,
  });

  if (env.ADMIN_NOTIFY_EMAIL) {
    await sendEmail(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: `New application: ${app.studentName}`,
      html: `
        <p>A new application was submitted (payment not yet confirmed).</p>
        <ul>
          <li><b>Student:</b> ${escapeHtml(app.studentName)} (DOB ${escapeHtml(app.studentDob)})</li>
          <li><b>Guardian:</b> ${escapeHtml(app.guardianName)}</li>
          <li><b>Email:</b> ${escapeHtml(app.email)}</li>
          <li><b>Phone:</b> ${escapeHtml(app.phone)}</li>
          <li><b>Modules:</b> ${modulesSummary(app)}</li>
          <li><b>Plan:</b> ${escapeHtml(app.selectedPlan.type)} · ${escapeHtml(app.selectedPlan.months)} months</li>
        </ul>
        <p>View full details (medical/emergency info, address) in the admin dashboard at /admin.</p>
      `,
    });
  }
}

async function sendPaymentConfirmedEmails(env, app, origin) {
  await sendEmail(env, {
    to: app.email,
    subject: "Welcome to Adders Film School!",
    html: `
      <p>Hi ${escapeHtml(app.guardian_name)},</p>
      <p>Payment for <b>${escapeHtml(app.student_name)}</b>'s membership is confirmed — welcome to Adders Film School!</p>
      <p>Modules: <b>${[app.month1, app.month2, app.month3].filter(Boolean).map(escapeHtml).join(" → ")}</b></p>
      <p>Here's the <a href="${origin}/timetable.pdf">timetable for October–December 2026</a> so you know exactly
      when each session runs.</p>
      <p>If you have any questions before the first session, just get in touch.</p>
      <p>— Adders Film School</p>
    `,
  });

  if (env.ADMIN_NOTIFY_EMAIL) {
    await sendEmail(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: `Payment confirmed: ${app.student_name}`,
      html: `<p><b>${escapeHtml(app.student_name)}</b>'s payment has been confirmed via Stripe.</p>`,
    });
  }
}

async function sendAuditionConfirmedEmails(env, app, origin) {
  await sendEmail(env, {
    to: app.email,
    subject: "Your Adders Film School audition is confirmed",
    html: `
      <p>Hi ${escapeHtml(app.guardian_name)},</p>
      <p>The £25 audition fee for <b>${escapeHtml(app.student_name)}</b> has been received — the audition for our
      two-week intensive course is confirmed.</p>
      <p>Audition strand: <b>${escapeHtml(app.discipline)}</b></p>
      <p>We'll be in touch with the audition date, time and venue. If ${escapeHtml(app.student_name)} is offered a
      place, the £100 course fee will be payable separately.</p>
      <p>If you have any questions in the meantime, just get in touch.</p>
      <p>— Adders Film School</p>
    `,
  });

  if (env.ADMIN_NOTIFY_EMAIL) {
    await sendEmail(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: `Audition payment confirmed: ${app.student_name}`,
      html: `<p><b>${escapeHtml(app.student_name)}</b>'s £25 audition fee (${escapeHtml(app.discipline)}) has been confirmed via Stripe.</p>`,
    });
  }
}

/* ===========================================================================
   ADMIN AUTH — password + HMAC-signed session cookie. No data is exposed
   to the browser until the signature on the session cookie is verified
   server-side on every request to /api/admin/*.
   =========================================================================== */
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const SESSION_COOKIE = "admin_session";

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function createSessionCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = btoa(JSON.stringify({ exp }));
  const sig = await hmacSha256Hex(env.ADMIN_SESSION_SECRET, payload);
  const value = `${payload}.${sig}`;
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

async function isValidSession(request, env) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;

  const [payload, sig] = match[1].split(".");
  if (!payload || !sig) return false;

  const expectedSig = await hmacSha256Hex(env.ADMIN_SESSION_SECRET, payload);
  if (!timingSafeEqual(sig, expectedSig)) return false;

  try {
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function handleAdminLogin(request, env) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: "Admin login is not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const valid = password.length > 0 && timingSafeEqual(password, env.ADMIN_PASSWORD);
  if (!valid) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  const cookie = await createSessionCookie(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}

function handleAdminLogout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() },
  });
}

async function handleAdminApplications(request, env) {
  if (!(await isValidSession(request, env))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM applications ORDER BY created_at DESC`
  ).all();

  return Response.json({ applications: results });
}

async function handleAdminAuditions(request, env) {
  if (!(await isValidSession(request, env))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM auditions ORDER BY created_at DESC`
  ).all();

  return Response.json({ auditions: results });
}
