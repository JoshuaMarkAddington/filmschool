-- MIGRATION — run this ONCE against an existing `auditions` table that was
-- created by the earlier version of the audition form (the one that stored
-- discipline / student_dob / address / medical columns).
--
-- Why it's needed: /api/audition now inserts age_bracket, audition_time and
-- consent_legal. If those columns don't exist yet, every sign-up fails with
-- "no such column" and the parent sees the "we couldn't save your sign-up"
-- error instead of reaching Stripe.
--
-- Run it with:
--   npx wrangler d1 execute filmschool --remote --file=migrate-auditions.sql
--
-- SQLite has no "ADD COLUMN IF NOT EXISTS", so if a column is already there
-- you'll get "duplicate column name: ..." — that error is harmless, it just
-- means this migration (or part of it) has already been applied. If one
-- statement fails, run the remaining lines individually.
--
-- On a brand-new database you do NOT need this file — schema-auditions.sql
-- already creates the table with every column.

ALTER TABLE auditions ADD COLUMN age_bracket TEXT;
ALTER TABLE auditions ADD COLUMN audition_time TEXT;
ALTER TABLE auditions ADD COLUMN consent_legal INTEGER;

-- Verify afterwards — this should list age_bracket, audition_time and
-- consent_legal alongside the existing columns:
--   npx wrangler d1 execute filmschool --remote --command="PRAGMA table_info(auditions);"
