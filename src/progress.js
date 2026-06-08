// Local-only progress tracking for the daily puzzle.
//
// We deliberately do NOT depend on cookies for gameplay state: localStorage is
// the only source of truth for "did this user finish this puzzle, and how".
// All reads/writes are wrapped in try/catch so the game still works in
// private-mode browsers where storage throws.

const PROGRESS_KEY = "nanamicat.progress.v1";
const STREAK_KEY = "nanamicat.streak.v1";
const RECENT_KEY = "nanamicat.recentCompletions.v1";
const RESUME_KEY = "nanamicat.resume.v1";

const MAX_RECENT = 3;

/**
 * Per-puzzle in-progress resume state. Kept in a separate localStorage key
 * so clearing the completion log (e.g. to fix a sync bug) doesn't wipe the
 * user's mid-game state, and vice versa.
 *
 * Shape:
 *   {
 *     puzzleId: string,
 *     date:     string,        // ISO YYYY-MM-DD this resume belongs to
 *     selected: string[],      // item ids the player had selected but not submitted
 *     solvedNames: string[],   // group names already solved (preserves order)
 *     mistakes: number,
 *     gameStartTs: number,     // Date.now() when the player first opened this puzzle,
 *                            //  so the post-resume time counter doesn't reset.
 *     updatedAt: string        // ISO timestamp of last write
 *   }
 */

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be disabled or full. We silently give up — gameplay
    // does not depend on persistence.
  }
}

function todayIsoDate(timeZone = "UTC") {
  // Use the visitor's local date so streaks don't reset at 00:00 UTC.
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(now); // YYYY-MM-DD
}

function readProgressMap() {
  const parsed = safeRead(PROGRESS_KEY, null);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }
  return {};
}

function readStreak() {
  const parsed = safeRead(STREAK_KEY, null);
  if (parsed && typeof parsed === "object" && Number.isFinite(parsed.current)) {
    return { current: Math.max(0, Math.floor(parsed.current)), lastDate: typeof parsed.lastDate === "string" ? parsed.lastDate : null };
  }
  return { current: 0, lastDate: null };
}

function readRecent() {
  const parsed = safeRead(RECENT_KEY, null);
  return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
}

export function getProgress(date) {
  if (!date) return null;
  const map = readProgressMap();
  return map[date] ?? null;
}

export function getAllProgress() {
  return readProgressMap();
}

export function getStreak() {
  return readStreak();
}

export function getRecentCompletions() {
  return readRecent();
}

/**
 * Mark a puzzle as completed for a given date. Updates progress, streak and
 * the "recently completed" ring buffer in one pass.
 */
export function recordCompletion({ date, puzzleId, mistakes, timeSeconds }) {
  if (!date) return null;
  const perfect = mistakes === 0;
  const map = readProgressMap();
  const entry = {
    completed: true,
    mistakes: Math.max(0, Math.floor(mistakes ?? 0)),
    timeSeconds: Math.max(0, Math.floor(timeSeconds ?? 0)),
    perfect,
    puzzleId: puzzleId ?? null,
    lastPlayedAt: new Date().toISOString()
  };
  map[date] = entry;
  safeWrite(PROGRESS_KEY, map);

  // Update streak: a completion on the same day does not double-count;
  // a completion on the day after lastDate extends streak by 1.
  const streak = readStreak();
  let nextCurrent = streak.current;
  if (streak.lastDate === date) {
    nextCurrent = Math.max(streak.current, 1);
  } else if (streak.lastDate) {
    const prev = new Date(`${streak.lastDate}T00:00:00Z`);
    const curr = new Date(`${date}T00:00:00Z`);
    const dayDiff = Math.round((curr - prev) / 86_400_000);
    if (dayDiff === 1) {
      nextCurrent = streak.current + 1;
    } else if (dayDiff > 1) {
      nextCurrent = 1;
    } else {
      // dayDiff < 1 (clock skew or backfill) — keep current.
      nextCurrent = Math.max(streak.current, 1);
    }
  } else {
    nextCurrent = 1;
  }
  safeWrite(STREAK_KEY, { current: nextCurrent, lastDate: date });

  // Update recent ring buffer (most recent first).
  const recent = readRecent().filter((item) => item.date !== date);
  recent.unshift({ date, puzzleId: entry.puzzleId, perfect, timeSeconds: entry.timeSeconds, mistakes: entry.mistakes });
  safeWrite(RECENT_KEY, recent.slice(0, MAX_RECENT));

  return entry;
}

/**
 * Returns the puzzle index in `pool` for a given ISO date (YYYY-MM-DD),
 * using the same hash strategy as getTodayIndex so the "today" and
 * "yesterday" puzzles line up.
 */
export function puzzleIndexForDate(date, poolLength) {
  if (!date || !Number.isFinite(poolLength) || poolLength <= 0) return 0;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 0;
  return (d.getUTCFullYear() * 372 + d.getUTCMonth() * 31 + d.getUTCDate()) % poolLength;
}

/**
 * Build a list of recent dates (most recent first) for the archive page.
 * Defaults to the last 30 days including today.
 */
export function buildArchiveDates(days = 30, referenceDate = todayIsoDate()) {
  const out = [];
  const base = new Date(`${referenceDate}T00:00:00Z`);
  for (let i = 0; i < days; i += 1) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function getTodayIsoDate() {
  return todayIsoDate();
}

// ──────────────────────────────────────────────────────────────────────────
//  Resume (in-progress) state
// ──────────────────────────────────────────────────────────────────────────

/**
 * Should we restore the player's in-progress state for this puzzle?
 *
 *  - No resume saved → no.
 *  - Resume was for a different puzzle → no.
 *  - Resume says the puzzle is completed → no.
 *  - Mistakes already at/over max → no, the player needs a fresh start.
 *  - Mistakes over 75% of max → no, the experience is so close to "failed"
 *    that resuming feels punishing. Give them a clean slate.
 */
export function shouldResume(resume, puzzleId, maxMistakes) {
  if (!resume || !puzzleId) return false;
  if (resume.puzzleId !== puzzleId) return false;
  if (resume.completed) return false;
  if (Number.isFinite(resume.mistakes) && maxMistakes) {
    if (resume.mistakes >= maxMistakes) return false;
    if (resume.mistakes >= Math.floor(maxMistakes * 0.75)) return false;
  }
  return true;
}

export function readResume(puzzleId) {
  if (!puzzleId) return null;
  const map = safeRead(RESUME_KEY, null);
  if (!map || typeof map !== "object") return null;
  return map[puzzleId] ?? null;
}

export function writeResume(puzzleId, partial) {
  if (!puzzleId) return;
  const map = safeRead(RESUME_KEY, null) || {};
  const previous = map[puzzleId] || {};
  const next = {
    puzzleId,
    date: partial.date ?? previous.date ?? null,
    selected: Array.isArray(partial.selected) ? partial.selected.slice() : [],
    solvedNames: Array.isArray(partial.solvedNames) ? partial.solvedNames.slice() : [],
    mistakes: Number.isFinite(partial.mistakes) ? Math.max(0, Math.floor(partial.mistakes)) : 0,
    gameStartTs: Number.isFinite(partial.gameStartTs) ? partial.gameStartTs : (previous.gameStartTs || Date.now()),
    completed: Boolean(partial.completed),
    updatedAt: new Date().toISOString()
  };
  map[puzzleId] = next;
  safeWrite(RESUME_KEY, map);
}

export function clearResume(puzzleId) {
  if (!puzzleId) return;
  const map = safeRead(RESUME_KEY, null);
  if (!map || typeof map !== "object") return;
  if (puzzleId in map) {
    delete map[puzzleId];
    safeWrite(RESUME_KEY, map);
  }
}
