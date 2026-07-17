-- Storage for the two-week intensive-course audition sign-ups (audition.html →
-- POST /api/audition). Mirrors the `applications` table but drops the
-- membership-specific module/plan columns and adds the audition `discipline`.
--
-- Apply against the D1 database bound as DB (see wrangler.jsonc):
--   npx wrangler d1 execute filmschool --remote --file=schema-auditions.sql
CREATE TABLE IF NOT EXISTS auditions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending_payment',
  discipline TEXT,                 -- Dance | Singing | Dancing & Singing | Acting
  student_name TEXT,
  student_dob TEXT,
  new_to_performing INTEGER,
  guardian_name TEXT,
  guardian_dob TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  county TEXT,
  postcode TEXT,
  email TEXT,
  phone TEXT,
  emergency_same INTEGER,
  emergency_name TEXT,
  emergency_phone TEXT,
  emergency_relation TEXT,
  allergies INTEGER,
  allergies_detail TEXT,
  additional_needs INTEGER,
  additional_needs_detail TEXT,
  health_issues INTEGER,
  health_issues_detail TEXT,
  consent_filming INTEGER,
  consent_policy INTEGER,
  stripe_client_reference_id TEXT
);
