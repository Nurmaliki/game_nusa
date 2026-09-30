# Nusantara Survival

A 2D top-down **survival adventure** set in a tropical Nusantara archipelago.
Explore, gather, craft, build, and survive — then build a sailing boat to
continue your journey.

- **Genre:** top-down survival / exploration / crafting / base-building
- **Platform:** Web (desktop + mobile), installable as a PWA
- **Mode:** 100% single-player, client-side. No backend required.
- **Hosting:** Vercel (static shell + client game)

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| App shell/UI | SvelteKit 2 + Svelte 5 (runes) + TS         |
| Game engine  | Phaser 4 (WebGL/Canvas)                     |
| Persistence  | IndexedDB (`idb`)                           |
| Tests        | Vitest (unit/integration), Playwright (E2E) |
| Tooling      | ESLint, Prettier, svelte-check              |

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build (adapter-vercel)
npm run preview     # preview production build
npm run check       # svelte-check (type safety)
npm run lint        # prettier + eslint
npm run format      # prettier --write
npm run test:unit   # vitest (unit/integration)
npm run test:e2e    # playwright end-to-end
npm run icons       # regenerate the PWA icon set (procedural, no deps)
npm test            # unit + e2e
```

## Project Structure

```
src/
  routes/                     # SvelteKit pages (menu, /play, settings, about)
  lib/
    components/ game|hud|...  # Svelte UI
    game/
      core/     # bootstrap, event bus, movement, logger, placeholders
      config/   # balance + version (single source of gameplay numbers)
      scenes/   # Phaser scenes
      entities/ # Player, wildlife, npcs (Phaser-side)
      systems/  # simulation systems (clock, survival, ...)
      input/    # abstract input actions + Phaser impl
    data/       # data-driven content (items, recipes, buildings, ...)
    stores/     # Svelte rune stores (settings, ...)
    types/      # shared, engine-agnostic DTOs
docs/           # design + technical documentation
tests/e2e/      # Playwright specs
```

## Architecture Principles

- **SvelteKit** = application shell, menus, HUD, panels, save manager.
- **Phaser** = rendering, world, physics, entities, camera.
- **Game core** = pure, testable gameplay rules (no Phaser/Svelte imports).
- **Event bridge** = the only channel between Phaser and Svelte (typed).
- **Data-driven** = items, recipes, buildings, quests, balance live in data.

See `docs/` for details:
[GDD](docs/GDD.md) · [Technical Design](docs/TECHNICAL_DESIGN.md) ·
[Game Data](docs/GAME_DATA.md) · [Save System](docs/SAVE_SYSTEM.md) ·
[Test Plan](docs/TEST_PLAN.md) · [Roadmap](docs/ROADMAP.md) ·
[Release Checklist](docs/RELEASE.md)

## Deploy

Hosted on **Vercel** via `@sveltejs/adapter-vercel`. `vercel.json` sets the
security headers and the static cache policy (immutable hashed assets, a
revalidated service worker). The build id shown in **About** is taken from the
deploy commit (see `vite.config.ts`).

## Assets

All current visuals are **original programmatic placeholders** generated at
runtime (see `src/lib/game/core/placeholders.ts`). No third-party assets are
bundled. Final art can be dropped in by replacing texture keys.
