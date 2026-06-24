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

None of this works until the secrets below are set. Run these once, from the
repo root, after `wrangler login`:

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
