// generate-sitemap.mjs
// Build public/sitemap.xml on every `npm run build` (or run it manually).
// We expand /puzzle/:date URLs from a deterministic date range. Past dates
// get a stable lastmod (so search engines see the archive as a complete
// list), and the very latest "today" entry sits at the top with priority
// 1.0 so it gets crawled first.
//
// Usage: node scripts/generate-sitemap.mjs

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE = "https://nanamicat.com";
const TODAY = new Date();
const TODAY_ISO = TODAY.toISOString().slice(0, 10);

// Look back N days. 90 covers the archive UI's default range; we expose up
// to a year so search engines see a thick, ever-growing index. Tweak the
// number if Google Search Console complains about crawl budget.
const DAYS_BACK = 365;
const CUTOFF = new Date(TODAY);
CUTOFF.setUTCDate(CUTOFF.getUTCDate() - DAYS_BACK);

const lastmodFor = (date) => date.toISOString().slice(0, 10);

function puzzleUrl(date) {
  const iso = date.toISOString().slice(0, 10);
  return {
    loc: `${SITE}/puzzle/${iso}`,
    lastmod: lastmodFor(date),
    changefreq: "never",
    priority: "0.7"
  };
}

const entries = [];

// Static pages (always there, always high priority for /)
const staticPages = [
  { loc: `${SITE}/`, lastmod: lastmodFor(TODAY), changefreq: "daily", priority: "1.0" },
  { loc: `${SITE}/archive`, lastmod: lastmodFor(TODAY), changefreq: "daily", priority: "0.9" },
  { loc: `${SITE}/how-to-play`, lastmod: "2026-06-08", changefreq: "monthly", priority: "0.7" },
  { loc: `${SITE}/about`, lastmod: "2026-06-08", changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE}/contact`, lastmod: "2026-06-08", changefreq: "monthly", priority: "0.4" },
  { loc: `${SITE}/privacy`, lastmod: "2026-06-08", changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE}/terms`, lastmod: "2026-06-08", changefreq: "yearly", priority: "0.3" }
];
entries.push(...staticPages);

// Past N days of puzzles
for (let i = 0; i < DAYS_BACK; i += 1) {
  const d = new Date(TODAY);
  d.setUTCDate(TODAY.getUTCDate() - i);
  if (d < CUTOFF) break;
  entries.push(puzzleUrl(d));
}

// Sort: today's puzzle and homepage stay at the top, the rest by recency.
const todayKey = `${SITE}/puzzle/${TODAY_ISO}`;
const sorted = entries.sort((a, b) => {
  const aIsToday = a.loc === todayKey || a.loc === `${SITE}/`;
  const bIsToday = b.loc === todayKey || b.loc === `${SITE}/`;
  if (aIsToday && !bIsToday) return -1;
  if (bIsToday && !aIsToday) return 1;
  // Otherwise by date descending.
  return b.lastmod.localeCompare(a.lastmod);
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sorted
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
  )
  .join("\n")}
</urlset>
`;

const outPath = join(__dirname, "..", "public", "sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`wrote ${sorted.length} URLs to ${outPath} (today=${TODAY_ISO})`);
