# Save System — Nusantara Survival

> **Status: DESIGN + TYPES DEFINED (implementation in Phase 2 & 11).**
> Types live in `src/lib/types/save.ts`; storage will use IndexedDB via `idb`.

## Goals

- Robust, versioned, atomic, recoverable persistence of a single-player game.
- Never store class instances — only serializable DTOs.

## Storage

- **IndexedDB** (via `idb`). No `localStorage` for game state (settings only).
- Object stores (planned): `saves` (current snapshots), `backups`
  (previous snapshots), `meta` (slot summaries).
- **No per-frame writes.** Autosave is interval- and event-driven.

## Shape (`GameSave`)

```
schemaVersion, gameVersion, saveId, worldSeed,
createdAt, updatedAt,
player, inventory, equipment, world, buildings,
quests, npcs, skills, statistics, settings,
gameTimeMs, weather, chapterComplete
```

## Versioning & Migration

- `CURRENT_SCHEMA_VERSION = 1` (see `src/lib/game/config/version.ts`).
- Every schema change ships a **deterministic, tested, non-destructive**
  migration. The schema is never changed without a migration.
- Import flow: `parse → validate schema → migrate if supported → validate → confirm → write`.

## Atomic Write Strategy (planned)

```
serialize → validate → write temp snapshot → verify
          → promote to current → retain previous as backup
```

## Backup & Recovery (planned)

- Retain `BALANCE.save.backupRetention` (default 2) previous snapshots.
- If the primary save is corrupt, offer backup recovery in the UI.
- **Never overwrite a save before validation succeeds.**

## Autosave Triggers (planned)

Periodic interval (`BALANCE.save.autosaveIntervalMs`), quest completion,
important building placed, sleep, major progression, safe lifecycle events
(visibilitychange / pagehide), best-effort only.

## Settings

Settings are persisted separately to `localStorage` so they exist before any
save is loaded, and are mirrored into each save.

## Not in V1

No cloud save, no accounts, no server-side validation.
