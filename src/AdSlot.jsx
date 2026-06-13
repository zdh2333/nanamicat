// AdSlot — reserves a fixed-height area where an ad can later render.
//
// Design rules from the AdSense / SEO plan:
//   * Never block first paint.
//   * Always reserve the height up-front (no CLS, ever).
//   * Default state is "off" — no real ad code is requested unless
//     window.NANAMICAT_ADS_CONFIG.enabled === true.
//   * Slots can be turned on per environment via a runtime config injected
//     by the host page; we never hard-code the AdSense client ID.
//
// IMPORTANT: AdSense `data-ad-slot` MUST be the numeric unit id, NOT a
// human-readable name. We keep `slotName` (e.g. "result-bottom") as the
// logical key for analytics, and look up the real numeric id from a
// runtime config object (window.NANAMICAT_ADS_CONFIG.slots) before pushing.

import { useEffect, useRef } from "react";
import { trackAdSlotView, trackAdEnabledSession } from "./analytics.js";

const DEFAULT_ENABLED = false;
const DEFAULT_CLIENT_ID = "";

function readConfig() {
  if (typeof window === "undefined") {
    return { enabled: DEFAULT_ENABLED, clientId: DEFAULT_CLIENT_ID, slots: {} };
  }
  const cfg = window.NANAMICAT_ADS_CONFIG;
  if (cfg && typeof cfg === "object") {
    return {
      enabled: Boolean(cfg.enabled),
      clientId: typeof cfg.clientId === "string" ? cfg.clientId : DEFAULT_CLIENT_ID,
      slots: (cfg && cfg.slots && typeof cfg.slots === "object") ? cfg.slots : {}
    };
  }
  // Allow build-time env vars (Vite exposes import.meta.env.VITE_*).
  const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
  return {
    enabled: env.VITE_ENABLE_ADS === "true",
    clientId: env.VITE_ADSENSE_CLIENT_ID || DEFAULT_CLIENT_ID,
    slots: {}
  };
}

export default function AdSlot({ slotName, reservedHeight = 120, className = "", label }) {
  const height = Math.max(60, Math.min(300, Number(reservedHeight) || 120));
  const config = readConfig();
  const adsEnabled = config.enabled && config.clientId;
  // Numeric AdSense unit id. Falls back to undefined → we render placeholder.
  const slotId = config.slots ? config.slots[slotName] : undefined;
  const insRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    trackAdSlotView({ slotName, pagePath: typeof location !== "undefined" ? location.pathname : "/" });
    trackAdEnabledSession(adsEnabled);
  }, [slotName, adsEnabled]);

  // Activate the ad. React does NOT execute a <script> rendered in JSX, so the
  // adsbygoogle.push() MUST happen here in an effect once the <ins> is mounted.
  // Without this the reserved <ins> is inserted but never filled and stays blank.
  useEffect(() => {
    if (!adsEnabled || !slotId) return;
    if (pushedRef.current) return; // guard against StrictMode double-invoke
    const el = insRef.current;
    // Only push for an <ins> that hasn't already been processed by AdSense.
    if (el && el.getAttribute("data-adsbygoogle-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (e) {
      // A single failed slot must never break the page.
      if (typeof console !== "undefined") console.warn("adsbygoogle push failed", e);
    }
  }, [adsEnabled, slotId]);

  if (!adsEnabled || !slotId) {
    // Production-but-ads-off, or dev, or the slot has no real numeric id yet.
    // Render a tiny reserved placeholder that is invisible to humans but
    // keeps the layout stable.
    return (
      <div
        className={`ad-slot ad-slot--placeholder ${className}`.trim()}
        data-slot={slotName}
        data-ads-enabled={adsEnabled ? "missing-slot-id" : "false"}
        style={{ minHeight: `${height}px` }}
        aria-hidden="true"
      >
        {label ? <span className="ad-slot__label">{label}</span> : null}
      </div>
    );
  }

  // Ads enabled and we have a numeric slot id: render the AdSense ins element.
  // The push call is wrapped so a single failed slot does not break the page.
  return (
    <div
      className={`ad-slot ad-slot--live ${className}`.trim()}
      data-slot={slotName}
      data-ads-enabled="true"
      style={{ minHeight: `${height}px` }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: `${height}px`, width: "100%" }}
        data-ad-client={config.clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
