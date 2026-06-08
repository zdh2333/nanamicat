// Lightweight analytics wrapper. Designed to fail safely — every call is
// wrapped in try/catch so a broken analytics script can never break the game.
//
// Today this is a thin facade: it logs structured events to the console in
// dev (gated on import.meta.env.DEV) and pushes them onto a window queue.
// Drop a real provider (Plausible, GA4, Cloudflare Web Analytics beacon) in
// by implementing `flushEvent` below — no call site needs to change.

const QUEUE_KEY = "__nanamicat_event_queue__";
const FLUSH_KEY = "__nanamicat_event_flush__";

function ensureQueue() {
  if (typeof window === "undefined") return [];
  if (!Array.isArray(window[QUEUE_KEY])) {
    window[QUEUE_KEY] = [];
  }
  return window[QUEUE_KEY];
}

function safeEmit(eventName, payload) {
  try {
    if (!eventName || typeof eventName !== "string") return;
    const event = {
      name: eventName,
      payload: payload && typeof payload === "object" ? payload : {},
      ts: Date.now()
    };
    ensureQueue().push(event);
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event.name, event.payload);
    }
    // Hook for real providers: any script can install window.nanamicatFlush
    // to drain the queue. We do not auto-flush — that lets us keep this file
    // dependency-free.
    const flush = window[FLUSH_KEY];
    if (typeof flush === "function") {
      try {
        flush(event);
      } catch {
        // never throw out of analytics
      }
    }
  } catch {
    // swallow — analytics must never break the game
  }
}

export function trackPageView(path, referrer) {
  safeEmit("page_view", {
    path: typeof path === "string" ? path : (typeof location !== "undefined" ? location.pathname : "/"),
    referrer: referrer ?? (typeof document !== "undefined" ? document.referrer || "" : "")
  });
}

export function trackGameStart({ puzzleId, date }) {
  safeEmit("game_start", { puzzleId: puzzleId ?? null, date: date ?? null });
}

export function trackGameComplete({ puzzleId, date, timeSeconds, mistakes, perfect }) {
  safeEmit("game_complete", {
    puzzleId: puzzleId ?? null,
    date: date ?? null,
    timeSeconds: Math.max(0, Math.floor(timeSeconds ?? 0)),
    mistakes: Math.max(0, Math.floor(mistakes ?? 0)),
    perfect: Boolean(perfect)
  });
}

export function trackGameFail({ puzzleId, mistakes }) {
  safeEmit("game_fail", {
    puzzleId: puzzleId ?? null,
    mistakes: Math.max(0, Math.floor(mistakes ?? 0))
  });
}

export function trackGameGiveUp({ puzzleId, mistakes }) {
  safeEmit("game_give_up", {
    puzzleId: puzzleId ?? null,
    mistakes: Math.max(0, Math.floor(mistakes ?? 0))
  });
}

export function trackShareClick({ puzzleId, platform }) {
  safeEmit("share_click", {
    puzzleId: puzzleId ?? null,
    platform: platform ?? (typeof navigator !== "undefined" && navigator.share ? "native" : "clipboard")
  });
}

export function trackArchiveOpen(fromPath) {
  safeEmit("archive_open", { fromPath: fromPath ?? null });
}

export function trackPuzzleFromArchive({ puzzleId, date }) {
  safeEmit("puzzle_from_archive", { puzzleId: puzzleId ?? null, date: date ?? null });
}

export function trackAdSlotView({ slotName, pagePath }) {
  safeEmit("ad_slot_view", {
    slotName: slotName ?? null,
    pagePath: pagePath ?? (typeof location !== "undefined" ? location.pathname : "/")
  });
}

export function trackAdEnabledSession(value) {
  safeEmit("ad_enabled_session", { enabled: Boolean(value) });
}

// Expose the queue for debugging or for a provider to drain later.
export function getAnalyticsQueue() {
  return ensureQueue().slice();
}
