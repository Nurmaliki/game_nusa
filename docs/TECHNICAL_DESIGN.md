# Technical Design — Nusantara Survival

## 1. Layer Separation

```
┌───────────────────────────────────────────────┐
│ SvelteKit  (shell, menu, HUD, panels, save UI) │
│   ↕ typed GameEventBus (only bridge)           │
│ Phaser     (world, rendering, physics, camera) │
│   ↓ uses                                        │
│ Game Core  (pure TS: inventory, survival,      │
│            crafting, quests, save DTOs)        │
└───────────────────────────────────────────────┘
```

- **Game Core must not import Phaser or Svelte.** It holds pure logic and is
  unit-tested directly.
- **Phaser scenes** orchestrate presentation and call into Game Core.
- **Svelte** never instantiates gameplay rules; it renders state and emits
  intents through the bridge.

## 2. Event Bridge

`src/lib/game/core/event-bus.ts` implements a typed pub/sub bus keyed by
`GameEventMap` (`src/lib/types/events.ts`). Rules:

- Adding cross-layer communication = adding an entry to `GameEventMap`.
- `on()` returns a disposer; listeners MUST be disposed on teardown
  (scenes use `SHUTDOWN`, Svelte uses `$effect` cleanup).
- A throwing listener is isolated so the game loop never crashes.

Scenes obtain the bus via `this.registry.get('bus')` (set during `createGame`).

## 3. Input Abstraction

Physical keys map to **abstract actions** (`src/lib/game/input/actions.ts`).
Gameplay reads actions (`isDown('SPRINT')`), never keycodes. Mobile virtual
controls inject into the same action map, so gameplay code is device-agnostic.

`InputState` is the engine-agnostic interface; `PhaserInput` is the implementation.

## 4. Simulation Clock

`GameClock` (`src/lib/game/systems/game-clock.ts`) derives in-game time from
accumulated delta — **never** from the device system clock. Default
`msPerGameDay = 1_440_000` (24 real minutes ≈ 1 in-game hour = 1 real minute).
`darknessForHour()` provides a pure 0..1 ambient darkness curve.

## 5. Configuration

All gameplay numbers live in `src/lib/game/config/balance.ts` under a single
`BALANCE` object (`BALANCE.player.walkSpeed`, etc.). Never hardcode a gameplay
number in a module.

## 6. Versioning

`src/lib/game/config/version.ts` exposes `GAME_VERSION`, `BUILD_ID`, and
`CURRENT_SCHEMA_VERSION`, surfaced in Settings → About.

## 7. Rendering & Performance (planned)

- Chunk-based world management with an active radius around the player.
- Object pooling for projectiles/particles; limited active AI; spatial queries.
- No per-frame IndexedDB operations; autosave is interval/event driven.

## 8. Failure Handling

Errors are surfaced through `GAME_ERROR` and rendered as a non-blank, recoverable
UI. Phaser construction is guarded by try/catch with a WebGL-failure message.

## 9. SSR Policy

The `/play` route sets `ssr = false` and `prerender = true`. Phaser is only ever
constructed inside `onMount` (browser). The bus accessor is SSR-safe.

## 10. Deployment

`@sveltejs/adapter-vercel` with `runtime: 'nodejs22.x'`. No persistent filesystem
or long-running server is used; game state lives in IndexedDB on the client.
