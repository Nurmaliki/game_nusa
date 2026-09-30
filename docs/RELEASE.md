# Release Checklist — Nusantara Survival v1.0.0

> Production V1.0 is **100% single-player and client-side**. There is no backend,
> no accounts, and no server-side state. All progress lives in the player's
> browser (IndexedDB).

## What ships

| Item                | Notes                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| SvelteKit app shell | Menu, `/play`, `/settings`, `/about` — prerendered where possible.                                        |
| Phaser engine       | Loaded lazily inside `/play`; split into its own cacheable chunk.                                         |
| Game content        | 71 items · 46 recipes · 20 buildings · 20 resource nodes · 9 creatures · 5 quests · 4 NPCs (data-driven). |
| Save system         | IndexedDB, schema v2, checksummed exports, corruption recovery.                                           |
| PWA                 | Manifest + procedural icons + service worker (offline shell).                                             |
| Audio               | Procedural Web Audio synth (no asset files).                                                              |

## Deploy target

Vercel via `@sveltejs/adapter-vercel` (`runtime: 'nodejs22.x'`).
The app is **fully prerendered** (`src/routes/+layout.ts` sets `prerender = true`),
so `/`, `/about`, `/settings` and `/play` are static HTML served from the CDN —
no cold starts. `vercel.json` sets security headers and cache policy:

- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- `/sw.js` → `must-revalidate` (updates must land).
- `/_app/immutable/**` → `immutable` (content-hashed).

`VITE_BUILD_ID` is resolved at build time from the Vercel/GitHub commit sha
(falling back to the local short sha, then a timestamp) and shown in
**About**.

## Pre-release gate (must all pass)

```bash
npm run lint        # prettier --check . && eslint .
npm run check       # svelte-check: 0 errors, 0 warnings
npm run test:unit   # vitest
npm run build       # production build, no large-chunk warning regression
npm run test:e2e    # playwright (chromium)
```

Expected at v1.0.0: **347 unit tests**, **18 E2E flows**, all green, 0 page
errors.

## Manual smoke test (last pass)

1. **Menu** → "Game Baru" → `/play` renders the world, player moves (WASD),
   camera follows.
2. **Gather** a tree/rock; item lands in the inventory (toast + panel).
3. **Craft** a stone axe (hand) and a cooked item at a campfire.
4. **Build** a campfire; the building persists after a save/reload.
5. **Combat** — attack with `F`/`G`; kill a creature; loot drops.
6. **Death** — on 0 HP, a recoverable backpack drops; respawn; recover it.
7. **Quests** (`J`) → talk to an NPC (`E`) → drive the Chapter I chain to the
   **CHAPTER I COMPLETE** overlay.
8. **Save/reload** — leave to menu, "Lanjut": progress is intact.
9. **Settings** — volume, reduced motion, on-screen buttons, key map render.
10. **PWA** — install prompt / add-to-home; go offline and reload: the shell
    still boots.
11. **Mobile** — touch joystick + buttons work; rotate hint appears in portrait.

## Known non-blocking items

- Placeholder visuals are **procedural** (see `placeholders.ts`); final art can
  be dropped in by replacing texture keys.
- The Phaser engine chunk is inherently ~1.37 MB (gzip ~357 kB); cached
  independently and only fetched on `/play`.
- `npm run test:e2e` runs `playwright install` first; CI should pre-install
  browsers.

## Versioning

`GAME_VERSION` (`src/lib/game/config/version.ts`) must equal `package.json`
`version` — enforced by a unit test (`version.spec.ts`).
