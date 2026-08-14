"# filmschool"

## Signup flow — setup checklist

The application form (`apply.html`) saves every submission to D1, then sends
the applicant to Stripe checkout. The Worker (`src/worker.js`) also:

- emails the applicant + you when an application is submitted
- confirms payment via a Stripe webhook (rather than trusting the redirect)
  and emails both sides again once payment is confirmed
- serves a password-protected admin dashboard at `/admin` listing every
  applicant and everything they submitted (modules, address, medical info,
  consents, plan, status)

None of this works until the secrets below are set on the Worker. There are
two ways to set them:

### Option A — GitHub Actions (no Cloudflare dashboard navigation required)

A workflow at `.github/workflows/set-secrets.yml` ("Deploy and set secrets")
deploys the Worker from this repo and attaches all secret values, driven
entirely by GitHub repository secrets. This bypasses the Cloudflare
dashboard and the Git-integration build completely.

1. In Cloudflare, create an API token: **My Profile → API Tokens → Create
   Token → use the "Edit Cloudflare Workers" template**. Copy the token.
2. Find your Cloudflare **Account ID** (shown on the right-hand sidebar of
   the main Cloudflare dashboard page).
3. In GitHub: **repo → Settings → Secrets and variables → Actions → New
   repository secret**, and add each of the following (name, then value):
   - `CLOUDFLARE_API_TOKEN` — the token from step 1
   - `CLOUDFLARE_ACCOUNT_ID` — the ID from step 2
   - `ADMIN_PASSWORD` — password to log into `/admin`
   - `ADMIN_SESSION_SECRET` — any long random string (40+ characters)
   - `ADMIN_NOTIFY_EMAIL` — email that gets a ping on every signup
   - `RESEND_API_KEY` — from resend.com
   - `RESEND_FROM` — e.g. `"Adders Film School <noreply@yourdomain.com>"`, domain verified in Resend
   - `STRIPE_WEBHOOK_SECRET` — from the Stripe webhook you create below
4. In GitHub: **Actions tab → "Deploy and set secrets" → Run workflow**.

Re-run the workflow any time the code or a secret value changes — it
redeploys the Worker and re-attaches every secret.

### Option B — Wrangler CLI

Run these once, from the repo root, after `wrangler login`:

```sh
npx wrangler secret put RESEND_API_KEY        # from resend.com — for sending emails
npx wrangler secret put RESEND_FROM           # e.g. "Adders Film School <noreply@yourdomain.com>" — domain must be verified in Resend
npx wrangler secret put ADMIN_NOTIFY_EMAIL    # the email address that gets a ping on every signup
npx wrangler secret put ADMIN_PASSWORD        # password to log into /admin — make it long and random
npx wrangler secret put ADMIN_SESSION_SECRET  # random 32+ char string, e.g. `openssl rand -hex 32`
npx wrangler secret put STRIPE_WEBHOOK_SECRET # from the Stripe webhook you create below
```

Then in the Stripe dashboard, add a webhook endpoint:

- URL: `https://<your-worker-domain>/api/stripe/webhook`
- Event: `checkout.session.completed`
- Copy the signing secret it gives you into `STRIPE_WEBHOOK_SECRET` above.

Once those are set, visit `/admin` and log in with `ADMIN_PASSWORD` to see
every applicant.

The policy document shown in step "Policy Agreement" of the application form
is still a placeholder — send the real policy text/PDF and it'll be dropped
into `apply.html` in place of that note.

## Showcase 2026 audition sign-up

`audition.html` is a second sign-up form — same style as `apply.html` — for
the Adders Film School Showcase 2026 Audition Masterclass. It is open to
ages **13–18**, split into three audition sections by age bracket (13–14 /
15–16 / 17–18), each with its own time slot.

The audition is spread across two pages:

- **`audition.html`** — the event information page: fees, what you'll learn,
  the audition panel (built from `panel.js`, one biography page per panelist
  via `panelist.html`), the audition sections, the rehearsal timetable (built
  from `rehearsals.js`), what to wear and bring, and the flyer.
- **`audition-signup.html`** — the sign-up questionnaire and the full
  participation agreement, which the parent/guardian must accept before the
  Stripe checkout unlocks. `audition-success.html` handles the return from
  Stripe.

It saves to a separate `auditions` table (`POST /api/audition`) and both the
audition sign-up and its payment appear under the "Intensive-course auditions"
tab in `/admin`.

Pricing: £225 total per student. The £25 audition & masterclass fee is taken
at sign-up and deducted from the total as a goodwill gesture for students
offered a place, leaving a £200 balance payable as two £100 instalments.

The audition venue is set once, as `window.AUDITION_VENUE` in the `<head>` of
both `audition.html` and `audition-signup.html`, alongside `VENUE_CAVEAT` —
the booking is not yet fixed, so every mention of the venue is shown with the
caveat.

The show venue is not booked either. Show Day is still **Saturday 5th
September 2026 in Milton Keynes**, but the venue is described as "to be
confirmed" everywhere it appears — `index.html`, `audition.html`,
`rehearsals.js` and the participation agreement in `audition-signup.html`.
Keep those in step when the venue is finally booked.

Setup:

1. **Database table.** Create the `auditions` table once (already created on
   the production D1, but re-run any time you rebuild the database):

   ```sh
   npx wrangler d1 execute filmschool --remote --file=schema-auditions.sql
   ```

   If the table already exists from the earlier discipline-based sign-up, run
   `migrate-auditions.sql` instead to move it to the age-bracket columns.

2. **Stripe link.** `AUDITION_STRIPE_LINK` in `audition-signup.html` is the
   live Payment Link for the £25 audition & masterclass fee. The £200 balance
   is collected separately from students who are offered a place, so it needs
   no link here.

Still to fill in — these are live on the site with visible placeholders:

- The company postal address in the participation agreement
  (`audition-signup.html`), which still shows `[Company Address]` in three
  places, and the rehearsal and Performance Day venues, which show
  `[TO BE CONFIRMED – Milton Keynes]` and `[Venue TBC – Milton Keynes]`.
- The flyer image (`audition-flyer.jpg`), which `audition.html` shows a
  "coming soon" placeholder for until the file is added.

## Discounts & early-access sign-up pop-up

Every public page (`index.html`, `membership.html`, `masterclass.html`,
`contact.html`) shows a centred pop-up shortly after it loads — "Sign up
now!" / "Receive discounts and latest information", and name / email / phone
fields (`signup-popup.js` + styles in `styles.css`). The visitor must give
**at least one** of email or phone. On submit the logo spins and a "Thank
you!" message confirms the sign-up. To avoid nagging, the pop-up never
reappears after someone signs up, and waits a week after a dismissal (tracked
in the browser's `localStorage`).

Sign-ups POST to `/api/subscribe`, which stores the lead in a `subscribers`
D1 table (created automatically on first sign-up — no manual database step
needed) and then, best-effort:

- emails the visitor a "Welcome to Adders Film School" message (if they gave an
  email) via Resend — reuses the existing `RESEND_API_KEY` / `RESEND_FROM`
  secrets, so no extra email setup is needed
- texts the visitor a welcome message (if they gave a phone number) — see below
- pings `ADMIN_NOTIFY_EMAIL` so you know a new lead came in

All sign-ups appear under a new **"Discounts & News Sign-Ups"** list in
`/admin`, alongside the membership and audition lists, with CSV export.

One optional setup step:

- **Welcome text via CircleLoop.** CircleLoop has no public API, but it can
  send an SMS from a **Zapier "Send SMS" action**. "Webhooks by Zapier" (Catch
  Hook) is a paid-plan-only trigger, so this uses **"Email by Zapier"**
  instead — a free trigger that fires when an email lands in a
  Zapier-provided inbox address. Wire it up once:

  - In Zapier, create a Zap with an **"Email by Zapier" → "New Inbound Email"**
    trigger. It gives you a unique address like
    `something123@robot.zapier.com` — copy it.
  - Add a **CircleLoop → "Send SMS"** action to that Zap. Map the recipient to
    the trigger's **Subject** field and the message to its **Body Plain**
    field (the Worker emails that address with the phone number as the
    subject and the welcome message as the body — no extra parsing step
    needed).
  - Set that inbox address as the `ZAPIER_SMS_EMAIL` secret on the Worker,
    either as a GitHub repository secret (the "Deploy and set secrets"
    workflow picks it up) or via `npx wrangler secret put ZAPIER_SMS_EMAIL`.

  Until `ZAPIER_SMS_EMAIL` is set, phone sign-ups are still saved and shown in
  admin — they just won't trigger a text (the "Welcome text sent" column shows
  "No"). Email sign-ups work with no extra setup.
