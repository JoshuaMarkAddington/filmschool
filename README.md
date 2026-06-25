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

A workflow at `.github/workflows/set-secrets.yml` pushes secret values
straight into the live Worker via `wrangler secret put`, driven entirely by
GitHub repository secrets.

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
4. In GitHub: **Actions tab → "Set Cloudflare Secrets" → Run workflow**.

Re-run the workflow any time a secret value changes. This does not deploy
new code — it only attaches secrets to the Worker that's already live.

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
