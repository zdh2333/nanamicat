// Force /ads.txt to always resolve to a real plain-text response.
//
// public/ads.txt already ships the same content as a static asset, but a Pages
// Function takes precedence over static assets and _redirects, so this is the
// most robust way to guarantee the Google AdSense crawler gets a 200 + a
// text/plain body every time (no SPA fallback, no stale cache, no edge quirks).
//
// IMPORTANT: keep this single line identical to public/ads.txt.
const ADS_TXT = "google.com, pub-4282000221262612, DIRECT, f08c47fec0942fa0\n";

export function onRequestGet() {
  return new Response(ADS_TXT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Let crawlers and the edge cache it briefly; ads.txt changes very rarely.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
