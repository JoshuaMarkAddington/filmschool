// Worker entry point. Static assets (index.html, apply.html, success.html, …)
// are served by the ASSETS binding; this script only handles /api/* routes
// (see assets.run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply" && request.method === "POST") {
      return handleApply(request, env);
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
