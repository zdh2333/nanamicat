// StickyAdBar — page-bottom pinned ad bar with a collapse/expand triangle.
//
// Behaviour:
//   * Hidden entirely (returns null) when NANAMICAT_ADS_CONFIG is off or the
//     AdSense client id is missing. We never show an empty bar; that would
//     itself feel like a CLS / UX bug.
//   * When ads are on, the bar is `position: fixed` at the bottom of the
//     viewport. A triangle button on the right collapses the bar down to a
//     36px handle; clicking again expands it.
//   * The collapsed/expanded choice is persisted in localStorage so a user
//     who hid the bar on day one does not see it pop up again on day two.
//   * It does NOT push to adsbygoogle here — that lives in AdSlot so we
//     keep one canonical place that talks to AdSense.
//   * It does NOT sit above critical UI (no nav, no share buttons in the
//     fixed bar itself), satisfying the "do not occlude game" rule.

import { useEffect, useState } from "react";
import AdSlot from "./AdSlot.jsx";

const COLLAPSE_KEY = "nanamicat:ad-bar:collapsed";
const DEFAULT_RESERVED = 90; // px — AdSense responsive bar height

function readAdsEnabled() {
  if (typeof window === "undefined") return false;
  const cfg = window.NANAMICAT_ADS_CONFIG;
  if (cfg && typeof cfg === "object") {
    return Boolean(cfg.enabled && cfg.clientId);
  }
  const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
  return env.VITE_ENABLE_ADS === "true" && Boolean(env.VITE_ADSENSE_CLIENT_ID);
}

function readInitialCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export default function StickyAdBar({
  slotName = "page-bottom",
  reservedHeight = DEFAULT_RESERVED
}) {
  // Read initial state synchronously so we don't paint the expanded bar for
  // a frame and then snap to collapsed when a returning user prefers it
  // hidden. localStorage is unavailable during SSR; the guards handle that.
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readInitialCollapsed());
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(readAdsEnabled());
    setCollapsed(readInitialCollapsed());
  }, []);

  // Don't render anything during SSR / first paint, and never render
  // when ads are off — that would just be a useless bar.
  if (!mounted || !enabled) return null;

  const onToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch (e) {
        // localStorage may be disabled — fall back to in-memory only.
      }
      return next;
    });
  };

  return (
    <div
      className={`sticky-ad-bar${collapsed ? " is-collapsed" : ""}`}
      data-slot={slotName}
      role="complementary"
      aria-label="Sponsored"
    >
      <div className="sticky-ad-bar__inner">
        <div className="sticky-ad-bar__slot">
          {/* Reuse AdSlot so config / analytics live in one place. */}
          <AdSlot slotName={slotName} reservedHeight={reservedHeight} className="sticky-ad-bar__adslot" />
        </div>
        <button
          type="button"
          className="sticky-ad-bar__toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="sticky-ad-bar-slot"
          aria-label={collapsed ? "Show sponsored bar" : "Hide sponsored bar"}
        >
          <svg
            className="sticky-ad-bar__chevron"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Triangle: collapsed → pointing down (click to expand),
                expanded → pointing up (click to collapse). */}
            <path
              d="M3 10L8 5L13 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
