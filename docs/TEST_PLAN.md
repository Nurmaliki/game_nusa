# Test Plan — Nusantara Survival

> **Status: GROWING.** Only currently-existing tests are marked ✅.

## Tooling

- **Vitest** — unit & integration (pure game core; environment: node).
- **Playwright** — end-to-end browser flows (chromium).

## Commands

```bash
npm run test:unit   # vitest
npm run test:e2e    # playwright
npm test            # both
```

## Unit / Integration Tests

| Area                             | Status                                                  |
| -------------------------------- | ------------------------------------------------------- |
| Movement helpers                 | ✅ movement.spec.ts                                     |
| Simulation clock / darkness      | ✅ game-clock.spec.ts                                   |
| Event bus delivery/cleanup       | ✅ event-bus.spec.ts                                    |
| Inventory stacking/capacity      | ✅ inventory.spec.ts                                    |
| Inventory move/split/merge       | ✅ inventory.spec.ts                                    |
| Crafting validation & atomicity  | ✅ crafting.spec.ts                                     |
| Survival calculation             | ✅ survival.spec.ts                                     |
| Gathering / tools / yields       | ✅ gathering.spec.ts                                    |
| GameState integration + save     | ✅ game-state.spec.ts                                   |
| World seed determinism           | ✅ generator.spec.ts                                    |
| Save validation / migration      | ✅ migration.spec.ts                                    |
| Save integrity / export envelope | ✅ integrity.spec.ts                                    |
| Damage / death / respawn         | ✅ backpack.spec.ts; damage ✅ combat.spec.ts           |
| Equipment / hotbar               | ✅ equipment.spec.ts                                    |
| XP / skill progression           | ✅ skills.spec.ts                                       |
| Quest conditions                 | ✅ quests.spec.ts                                       |
| NPC schedule / relationship      | ✅ npcs.spec.ts                                         |
| Content breadth / obtainability  | ✅ validation.spec.ts                                   |
| Touch controls bridge / device   | ✅ controls-bridge.spec.ts, device-helpers.spec.ts      |
| Procedural SFX & audio map       | ✅ sfx.spec.ts, audio-map.spec.ts, audio-engine.spec.ts |
| PWA/service-worker helpers       | ✅ sw-helpers.spec.ts                                   |
| Input action map                 | ✅ actions.spec.ts                                      |
| Balance invariants               | ✅ balance.spec.ts                                      |
| Full-loop integration (core)     | ✅ integration/full-loop.spec.ts                        |
| Loot                             | ✅ combat.spec.ts                                       |
| Building placement validation    | ✅ placement.spec.ts                                    |
| Building stations / anchors      | ✅ building-manager.spec.ts                             |
| Content validation               | ✅ validation.spec.ts                                   |
| Combat resolution / damage       | ✅ combat.spec.ts                                       |
| Creature AI (FSM)                | ✅ combat.spec.ts                                       |
| Wildlife spawn/despawn           | ✅ wildlife.spec.ts                                     |
| Wildlife in-place compaction     | ✅ wildlife.spec.ts (reap/despawn/step)                 |
| Biome memoized jitter stability  | ✅ chunk-manager.spec.ts                                |
| Controls reference builder       | ✅ controls-reference.spec.ts                           |
| Version ↔ package.json guard     | ✅ version.spec.ts                                      |

## E2E Browser Flows

| Flow                                                          | Status                   |
| ------------------------------------------------------------- | ------------------------ |
| Boot → menu → play → HUD (no page errors)                     | ✅ boot.e2e.ts           |
| New game → inventory/crafting/build/skills panels (no errors) | ✅ vertical-slice.e2e.ts |
| Combat → attack input + wildlife spawn (no errors)            | ✅ combat.e2e.ts         |
| Quests → quest log opens / closes (no errors)                 | ✅ quests.e2e.ts         |
| Main progression → CHAPTER I COMPLETE                         | ✅ progression.e2e.ts    |
| Mobile → touch joystick + buttons + rotate hint (no errors)   | ✅ mobile.e2e.ts         |
| Audio → engine init on play + volume change (no errors)       | ✅ audio.e2e.ts          |
| Persistence: slot in menu → export → re-import (no errors)    | ✅ persistence.e2e.ts    |
| Persistence: tampered export rejected on import               | ✅ persistence.e2e.ts    |
| PWA: manifest served + icons resolve (no errors)              | ✅ pwa.e2e.ts            |
| PWA: SW controls page + offline reload serves shell           | ✅ pwa.e2e.ts            |
| PWA: the game boots fully offline after first visit           | ✅ pwa.e2e.ts            |
| PWA: offline banner appears while disconnected                | ✅ pwa.e2e.ts            |
| New player: gather→craft→build→save persists (no errors)      | ✅ newplayer.e2e.ts      |
| Release: build metadata + key map + asset policy (no errors)  | ✅ release.e2e.ts        |

## Test Seams (deterministic readiness)

The app is SSR/prerendered, so markup is visible before SvelteKit hydrates; a
click on an SSR button before hydration is a no-op, and the engine is
lazy-loaded so keyboard input can be lost during the load window. Two tiny,
non-invasive markers remove that ambiguity (see `tests/e2e/helpers.ts`):

- `html[data-hydrated="true"]` — set in `+layout.svelte` `onMount`; the app is
  interactive.
- `.game-root[data-engine-ready="true"]` — set by `GameCanvas.svelte` on
  `GAME_STATE_READY`; Phaser is up.

`startNewGame(page)` waits for both. For offline/SW tests,
`ensureServiceWorkerControl(page)` reloads until the page is controlled (we never
call `clients.claim()`, and under parallel load the first reload can land before
the worker activates). These are the only readiness contracts E2E relies on — no
arbitrary sleeps.

## Quality Gate (per phase)

`npm run lint && npm run check && npm run test:unit && npm run build` and, where
relevant, `npm run test:e2e` must all pass. Failures are reported, never hidden.
