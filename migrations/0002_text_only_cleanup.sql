-- Archive image-clears snapshots before removing the column.
CREATE TABLE IF NOT EXISTS player_image_clears_archive (
  player_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  image_clears INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  archived_at TEXT NOT NULL
);

INSERT OR REPLACE INTO player_image_clears_archive (
  player_id,
  nickname,
  image_clears,
  total_score,
  created_at,
  updated_at,
  archived_at
)
SELECT
  id,
  nickname,
  image_clears,
  total_score,
  created_at,
  updated_at,
  datetime('now')
FROM players
WHERE COALESCE(image_clears, 0) > 0;

-- Archive historical image score events.
CREATE TABLE IF NOT EXISTS score_events_image_archive (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  mode TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL
);

INSERT OR REPLACE INTO score_events_image_archive (
  id,
  player_id,
  nickname,
  mode,
  puzzle_id,
  points,
  created_at,
  archived_at
)
SELECT
  id,
  player_id,
  nickname,
  mode,
  puzzle_id,
  points,
  created_at,
  datetime('now')
FROM score_events
WHERE mode = 'image';

-- Keep schema migration-safe for existing production constraints:
-- convert all historical data to text-only semantics.
DELETE FROM score_events
WHERE mode = 'image';

UPDATE players
SET image_clears = 0,
    total_score = text_clears,
    updated_at = datetime('now');
