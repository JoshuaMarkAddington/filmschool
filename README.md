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

## Intensive-course audition sign-up

`audition.html` is a second sign-up form — same style as `apply.html` — for
the two-week intensive course. It asks the same questions as the membership
form but, instead of modules, the applicant picks one strand to audition for
(Dance / Singing / Dancing & Singing / Acting) and is open to ages **13–18**.
It saves to a separate `auditions` table (`POST /api/audition`) and both the
audition sign-up and its payment appear under the "Intensive-course auditions"
tab in `/admin`.

Two setup steps are needed before it's live:

1. **Database table.** Create the `auditions` table once (already created on
   the production D1, but re-run any time you rebuild the database):

   ```sh
   npx wrangler d1 execute filmschool --remote --file=schema-auditions.sql
   ```

2. **Stripe link for the £25 audition fee.** In `audition.html`, replace the
   `AUDITION_STRIPE_LINK` placeholder with a real Stripe Payment Link for £25
   (created exactly like the membership links). The course fee (£100) is
   collected separately from students who are offered a place, so it needs no
   link here.
