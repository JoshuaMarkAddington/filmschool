-- Storage for the two-week intensive-course audition sign-ups
-- (audition-signup.html → POST /api/audition). Auditions run in sections by
-- age bracket, each with its own time slot; the £25 audition fee is taken via
-- Stripe, and the £100 course fee is handled separately for offered places.
--
-- Apply against the D1 database bound as DB (see wrangler.jsonc):
--   npx wrangler d1 execute filmschool --remote --file=schema-auditions.sql
CREATE TABLE IF NOT EXISTS auditions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending_payment',
  age_bracket TEXT,                -- 13-14 | 15-16 | 17-18
  audition_time TEXT,              -- section time derived from the age bracket
  student_name TEXT,
  guardian_name TEXT,              -- parent / responsible adult
  email TEXT,
  phone TEXT,
  emergency_phone TEXT,            -- emergency contact number
  consent_legal INTEGER,           -- parental / responsible-adult agreement accepted
  stripe_client_reference_id TEXT
);

-- ---------------------------------------------------------------------------
-- NOTE: `CREATE TABLE IF NOT EXISTS` above does nothing if an `auditions`
-- table already exists from the earlier version of the form — so it will NOT
-- add the new age_bracket / audition_time / consent_legal columns to it.
-- For an existing database, run migrate-auditions.sql instead:
--   npx wrangler d1 execute filmschool --remote --file=migrate-auditions.sql
