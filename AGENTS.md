# AGENTS.md — Nanami Cat / MeowGrid

> Repo map, conventions, and the recent state of the project. Read this before
> opening a branch or asking "where is X?".

## 1. What this is

A bilingual (中文 / English / 日本語) Connections-style daily puzzle game.

- **Stack:** React 19 + Vite 6, Express 5 dev server, Cloudflare Pages (web)
  + Cloudflare Workers (API) + D1 (SQL) + KV (community submissions).
- **Domain:** `nanamicat.com` (Cloudflare Pages, region JP/Asia).
- **iOS app source:** `NanamiCat-iOS/` (Swift, separate Xcode project sharing
  the puzzle JSON manifest).

Single-source-of-truth puzzle data lives at
`NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json` and propagates to
`public/puzzle-data.json` and `docs/` via `npm run sync:puzzles`.

## 2. Repo layout (the parts that matter)

```
index.html                       AdSense <head> config (window.NANAMICAT_ADS_CONFIG)
wrangler.toml                    Worker bindings: D1 id, KV id, route patterns
worker/
  nanamicat-api.js               Prod API: /api/region, /api/player, /api/score,
                                /api/leaderboard, /api/puzzles, /api/admin/*
  schema.sql                     Local-dev reference schema (older shape — see below)
server/
  dev-api.js                     Dev-only JSON-file backed API (mounted by server.js)
  static-pages.js                /about, /how-to-play, /contact, /legal, /privacy
server.js                        Express 5 dev server (npm start)
src/
  main.jsx                       The whole app: routing, board, modals, leaderboard
  Archive.jsx                    /archive view (lazy-loaded)
  progress.js                    localStorage helpers + IP-region-aware
                                default nickname + stable playerId
  puzzleEngine.js                balanced picker (pickBalancedNext, maxShared=0)
  leaderboardSync.js             pending-score sync helpers (read/add/remove +
                                syncPlayedPuzzleScores for offline-first play)
  puzzleDifficulty.js            puzzleDifficultySummary(locale)
  puzzles.js, analytics.js       legacy
  AdSlot.jsx, StickyAdBar.jsx    AdSense slots
migrations/
  0001_initial.sql               players, score_events, puzzle_submissions
  0002_text_only_cleanup.sql     drops image-clears column + archives data
  0003_submission_contact_email.sql  adds puzzle_submissions.contact_email
                                 (legacy — see §6, currently dormant)
docs/
  LEADERBOARD-ID-DESIGN.md       Recent design doc for the playerId + region
                                default-nickname system
  DESIGN.md, PRODUCT.md, ios-requirements.md
scripts/
  generate-sitemap.mjs           invoked by npm run build
  regenerate-manifest.mjs        zh puzzle manifest re-generator
  generate-ja-manifest.mjs / regenerate-manifest-ja.mjs  ja manifest
  sync-puzzle-data.mjs           npm run sync:puzzles
  verify-puzzles.mjs             data health check
  validate-puzzles.mjs / validate-puzzle-manifest.mjs / validate-translations.mjs
  audit-ja.mjs                   Japanese habit auditor
  fill-english-terms.mjs         fills `englishName` / `englishWords` on bank
  export-puzzle-data.mjs         legacy alias → sync-puzzle-data.mjs
  export-puzzle-port-spec.mjs    extracts engine constants for Swift port docs
  visual-ja/                     Playwright ja-locale overflow sweep
  gen-puzzles.py / generate-puzzle-manifest.py  legacy generators
tests/
  adsense-head.test.mjs          node:test — verifies <head> tags survive build
  leaderboard-sync.test.mjs      node:test — leaderboard offline-sync logic
  puzzle-difficulty.test.mjs     node:test
  seo-schema.test.mjs            node:test
  static-pages.test.mjs          node:test
public/                          built static assets (served in dev, copied to
                                Pages root after build)
data/                            dev-only JSON files (gitignored in spirit; the
                                workers do not read this)
```

## 3. Day-to-day commands

```sh
npm install
npm run dev                  # vite + express on :4173
npm run build                # generate-sitemap + vite build
npm run sync:puzzles         # mirror iOS source-of-truth into public/ + docs
npm run validate:puzzles     # manifest constraints
npm run test:leaderboard     # node:test, fast
npm run test:puzzles         # validate the puzzle data file shape

# Deploy
npx wrangler deploy                      # worker only (needs `wrangler login`)
git push origin main                     # Pages auto-builds + deploys
```

The Cloudflare dashboard for this account: https://dash.cloudflare.com
(Account ID `60255aed01a84f0f19cb7e018d16161d`).

## 4. Production stack (concrete)

| Layer | Where | Notes |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Auto-builds on `git push origin main` |
| Backend | Cloudflare Worker | Routes: `nanamicat.com/api/*`, `nanamicat.com/admin*` |
| DB | Cloudflare D1 `nanamicat-db` (`325aaa3d-5414-421f-8527-f5930516593b`) | tables: `players`, `score_events`, `puzzle_submissions` |
| KV | `NANAMICAT_SUBMISSIONS` (`133576614a374913aff648473fafe279`) | community puzzles |
| Mail | **removed** (2026-06) | no MAIL_FROM, no SMTP, no Resend, no `puzzle_submissions.contact_email` writes |
| AdSense | `ca-pub-4282000221262612` | 4 ad units configured: page-bottom, ad-page-bottom, ad-result-bottom, ad-archive-bottom |

## 5. Recent shipped work (last 2 weeks)

| Date | What |
| --- | --- |
| 2026-06-13 | **Ad cleanup.** Removed all email functionality (see §6). |
| 2026-06-13 | AdSlot: adsbygoogle.push() now runs in useEffect, not JSX `<script>` (React doesn't execute the latter — ads would never fill). |
| 2026-06-13 | Configured 4 AdSense Display ad units in `index.html` (slot ids `8939187170` / `6504595523` / `3068789107` / `3084225268`). |
| 2026-06-12 | i18n fixes: English term fallback + cache version. |
| 2026-06-11 | **Leaderboard playerId + IP-region default nickname.** See `docs/LEADERBOARD-ID-DESIGN.md`. |
| 2026-06-10 | AdSense verification script + leaderboard only-on-first-click guard. |
| 2026-06-08 | Cloudflare Pages deploy workflow, font weight tune, /control-panel fix. |

## 6. Email cleanup (2026-06-13)

The project no longer collects contact emails. Removed in commit `a1298a6`:

- `src/main.jsx`: form `<input type="email">` and 3 `t.contactEmail` / `t.thankYouEmail*` keys; admin panel's `item.contact_email` row.
- `worker/nanamicat-api.js`: `sendThankYouEmail`, `buildThankYouMessage`, `normalizeEmail`; INSERT/SELECT/serialize no longer touch `contact_email`.
- `server.js` (v1 dev): `nodemailer` import, `mailTransport`, `sendThankYouEmail`, `escapeHtml` (only used by the mail function).
- `server/dev-api.js`: `normalizeEmail`, `contact_email` in INSERT.
- `wrangler.toml`: `MAIL_FROM`, `REPLY_TO` env vars.
- `package.json` / `package-lock.json`: `nodemailer` dependency.

**Preserved on purpose:**
- D1 `puzzle_submissions.contact_email` column (added by `migrations/0003_submission_contact_email.sql`; not dropped — would require a new migration and a data audit). Old rows remain readable, but new submissions no longer write to it.
- `request.headers.get('CF-Access-Authenticated-User-Email')` in admin auth (Cloudflare Zero Trust, not user-facing email).

## 7. AdSense notes

`index.html` injects `window.NANAMICAT_ADS_CONFIG` before the `adsbygoogle.js` script tag. AdSlot reads it and pushes to `adsbygoogle` once the `<ins>` is mounted (in a useEffect — see §5). When `NANAMICAT_ADS_CONFIG.enabled === false` or a `slotName` has no entry in `.slots`, AdSlot renders a height-locked placeholder (no CLS, no real ad request).

New ad units (June 2026):

| slotName (key) | ad unit id | where it renders |
| --- | --- | --- |
| `page-bottom` | `8939187170` | StickyAdBar (fixed bottom) |
| `ad-page-bottom` | `6504595523` | main page footer |
| `ad-result-bottom` | `3068789107` | result / end-of-game card |
| `ad-archive-bottom` | `3084225268` | `/archive` footer |

`ads.txt` is at `public/ads.txt` and points at `pub-4282000221262612`.

## 8. Region + default nickname

`src/progress.js`:

- `guessRegionFromBrowser()` — last-resort locale heuristic (e.g. `ja` → `Tokyo`, `zh` → `Beijing`).
- `sanitiseRegionPrefix(region)` — strips control chars / punctuation from server-provided region.
- `defaultNickname(preferredRegion)` — returns `${sanitisedRegion}${4-digit-suffix}`. Falls back to browser-locale guess if the server didn't supply a region.
- `newPlayerId()` — returns `player_<uuid>`.

On first mount, `src/main.jsx` hits `GET /api/region`, the worker reads `request.cf.city` + `request.cf.country` and returns a sanitised prefix via a built-in transliteration table (~100 major cities), then upserts to `/api/player` so the row is on the leaderboard even with 0 clears.

## 9. Conventions

- **No new dependencies without reason.** This project has a tiny surface (express + react + vite). Every `npm install` should be reviewable in one minute.
- **i18n strings live in the `copy` object in `src/main.jsx`** keyed by locale. Add a new key to all three blocks (`zh`/`en`/`ja`) in one commit — `scripts/validate-translations.mjs` enforces shape parity.
- **No silent format changes.** If you change the puzzle manifest, run `npm run validate:puzzles` and `npm run test:puzzles` before committing.
- **The dev API and the worker API both implement `/api/leaderboard`, `/api/player`, `/api/score`.** When adding a new endpoint, add it to both. The dev API lives in `server/dev-api.js`; the worker is the source of truth for response shape.
- **AdSense slots must exist in `NANAMICAT_ADS_CONFIG.slots`** with the right `slotName` (the React-side `slotName` prop on `<AdSlot>`). Missing entries render a placeholder, not an error.

## 10. Known papercuts (worth knowing)

- **Vite HMR can briefly show a blank board on hot reload.** The resume-restore effect was hardened in commit `912a1cf` to gate the persist effect on a `useRef` — don't remove the `resumeAppliedFor` plumbing without re-testing.
- **`node_modules/.vite` cache sometimes breaks** after a Vite major bump. `rm -rf node_modules/.vite` and `npm run dev` again.
- **D1's `puzzle_submissions.player_id` has a FK to `players.id`.** When writing tests or smoke scripts, use an actual player id (e.g. `player_region_smoke_001`) — not `p_test` or `abc`.
- **Image readback in `mavis browser tool screenshot` fails** intermittently on macOS Sonoma/Sequoia. Workaround: use `mavis mcp call playwright browser_evaluate` for text-based checks, only use the real Chrome screenshot for one-off captures.
- **The Cloudflare Pages auto-deploy is git-driven.** No need to run `wrangler pages deploy` — just `git push origin main` and watch the Pages dashboard for a fresh deployment. The worker is a separate `wrangler deploy` (no GitOps hook for the worker yet).

## 11. How to add a new ad unit

1. AdSense console → Ads → By ad unit → New display ad unit. Note the numeric id.
2. Edit `index.html` `window.NANAMICAT_ADS_CONFIG.slots`: add `'<slotName>': '<numeric id>'`.
3. In `src/main.jsx` (or wherever the slot renders), pass the same `slotName` to `<AdSlot>`.
4. Commit + push. Pages auto-builds.
5. Wait 24-48h for the new ad unit to be reviewed and start filling. While you wait, the slot renders a height-locked placeholder (no CLS).
