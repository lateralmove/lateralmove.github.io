# Lateral Move

A relationship-first browser for the **MITRE ATT&CK® Enterprise** knowledge base.

The official site renders ATT&CK's graph (techniques ↔ groups ↔ software ↔ campaigns ↔
mitigations ↔ detections) as page-centric lists of one-way links. This rebuilds it so the
**relationships are the navigation**: every entity pivots to its neighbors, search is faceted, and
coverage gaps are surfaced.

> Independent project — not affiliated with The MITRE Corporation. Built on the public
> [attack-stix-data](https://github.com/mitre-attack/attack-stix-data) bundle.

## What's built (Phase 1 + analytics)

- **Smart Matrix** (home) — filter by platform/text, toggle sub-techniques, overlay **mitigation
  coverage** or **group usage** (pick a group → highlights its techniques).
- **Faceted search** (`/search`) — instant search across all object types with Type / Coverage /
  Tactic / Platform facets. Nav "Groups / Software / …" links are this view pre-filtered.
- **Relationship-rich entity pages** — quick-facts bar on top, then every edge shown bidirectionally
  with one-click pivots. Descriptions render with their original Markdown formatting, and ATT&CK links
  are rewritten to internal pages.
- **Command palette** (`⌘K` / `Ctrl-K`) — jump to anything.
- **Analytics** (`/analytics`) — ranked panels (techniques/software by group usage, most prolific
  groups, mitigations & data components by coverage, mitigation-gap by tactic). Click any panel
  title for the full ranking at `/analytics/<report>`.

## Stack

Next.js 16 (App Router, **static export**) · React 19 · Tailwind v4 · MiniSearch. No backend — the
ATT&CK STIX bundle is pre-processed into static JSON shards, so the whole thing deploys as static
files.

## Develop

```bash
npm install
npm run data     # download + normalize the ATT&CK STIX bundle -> public/data (cached in .cache/)
npm run dev      # http://localhost:3000
npm run build    # static export -> out/
```

`npm run data` must run at least once before `dev`/`build` (the generated `public/data/` is what the
app reads). Delete `.cache/` to pull a fresh ATT&CK release.

## Deploy

The site is published to **GitHub Pages** at <https://lateralmove.github.io/> by
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). The workflow runs
`npm ci → npm run data → npm run build` and uploads `out/` as the Pages artifact, so the
ATT&CK data and search index are baked in at deploy time — there's no backend.

It triggers on:

- **push to `main`** — deploy on every change,
- **a weekly cron** (Mondays 06:00 UTC) — rebuild against the latest ATT&CK STIX release
  (`npm run data` always pulls the newest bundle in CI),
- **manual dispatch** — from the repo's **Actions** tab.

**One-time setup** (already done for this repo, listed for forks): in **Settings → Pages →
Build and deployment**, set **Source** to **GitHub Actions**. No basePath/`assetPrefix` tuning is
needed because `lateralmove.github.io` is a user/org site served from the domain root. To deploy
under a project path instead (e.g. `user.github.io/repo`), set `basePath`/`assetPrefix` in
[`next.config.ts`](./next.config.ts).

## Data pipeline — `scripts/build-data.mjs`

Downloads `enterprise-attack.json`, resolves the STIX graph, and emits to `public/data/`:

| File | Purpose |
|---|---|
| `matrix.json` | ordered tactics → techniques (+ coverage flags) for the matrix |
| `search.json` | lightweight faceted search corpus |
| `manifest.json` | entity ids per type (drives `generateStaticParams`) |
| `entities/<type>/<id>.json` | per-entity detail incl. resolved relationships + neighbors |
| `meta.json` | version + counts |

### ATT&CK v19 note

The current bundle is **v19.1**, which replaced the old data-source/data-component detection model
with **detection strategies → analytics → log sources (data components)**:

```
technique ◀─detects─ detection-strategy ─▶ analytic ─▶ log source (data-component + channel)
```

The pipeline resolves this full chain. One consequence: v19 ships a detection strategy for *every*
technique, so the meaningful coverage gap is now **mitigation** (≈111 techniques uncovered), which
the matrix overlay and analytics emphasize.

## Not yet (future phases)

Mobile & ICS domains · Navigator-layer JSON import/export · richer graph (multi-hop expand).
