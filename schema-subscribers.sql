-- Storage for the "discounts & early access" newsletter sign-ups collected by
-- the site-wide pop-up (any page → POST /api/subscribe). These are marketing
-- leads, not membership/audition applications: a name plus at least one of an
-- email address or a phone number, and nothing sensitive.
--
-- Apply against the D1 database bound as DB (see wrangler.jsonc):
--   npx wrangler d1 execute filmschool --remote --file=schema-subscribers.sql
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,                       -- which page the sign-up came from
  email_sent INTEGER NOT NULL DEFAULT 0,  -- welcome email delivered to Resend
  sms_sent INTEGER NOT NULL DEFAULT 0     -- welcome text handed to CircleLoop
);
