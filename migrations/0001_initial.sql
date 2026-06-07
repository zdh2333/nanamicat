-- Initial schema: tables referenced by worker/nanamicat-api.js and functions/api/*
-- Note: image_clears is included here so 0002 can archive and zero it out.
-- Note: contact_email is NOT included here; 0003 adds it via ALTER TABLE.

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  text_clears INTEGER NOT NULL DEFAULT 0,
  image_clears INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_nickname
ON players (nickname);

CREATE INDEX IF NOT EXISTS idx_players_score
ON players (total_score DESC, text_clears DESC, updated_at DESC);

-- One row per (player, mode, puzzle). INSERT OR IGNORE uses this constraint to deduplicate.
CREATE TABLE IF NOT EXISTS score_events (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('text', 'image')),
  puzzle_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (player_id, mode, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_score_events_player
ON score_events (player_id);

CREATE INDEX IF NOT EXISTS idx_score_events_created
ON score_events (created_at DESC);

CREATE TABLE IF NOT EXISTS puzzle_submissions (
  id TEXT PRIMARY KEY,
  player_id TEXT,
  nickname TEXT NOT NULL,
  title TEXT NOT NULL,
  groups_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'reviewed', 'included', 'rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_status_created
ON puzzle_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_created
ON puzzle_submissions (created_at DESC);
