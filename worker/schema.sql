CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  title TEXT NOT NULL,
  contact_email TEXT NOT NULL DEFAULT '',
  groups_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  thank_you_email_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS submissions_status_created_at
ON submissions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('text', 'image')),
  puzzle_key TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS scores_created_at
ON scores (created_at DESC);
