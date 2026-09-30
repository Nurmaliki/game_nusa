# Game Design Document — Nusantara Survival

> **Status: IN PROGRESS.** This document reflects implemented systems only.
> Planned-but-unimplemented content is clearly labelled _Planned_.

## 1. Core Fantasy

You are shipwrecked on a tropical Nusantara island. Survive, explore three
biomes, craft tools, build a base, meet the island's inhabitants, uncover its
mystery, and build a sailing boat to continue your journey.

## 2. Core Loop

```
Explore → Gather → Craft → Build → Survive → Upgrade → Unlock Area → Explore
```

Secondary: `Quest → Reward → Upgrade → New Area → New Resource → Recipe → Better Gear`

## 3. World (Phase 3 — implemented)

One large island arranged as **concentric biome bands**: the tropical coast
forms the outer ring, the rainforest the middle, and the highlands the inner
core. Biome membership is computed deterministically from the world seed.

| Biome          | Resources                                 | Threat |
| -------------- | ----------------------------------------- | ------ |
| Tropical Coast | wood, stone, fiber, coconut, berry, shell | low    |
| Rainforest     | hardwood, herbs, clay                     | medium |
| Highlands      | iron ore, rare plants                     | higher |

The world is **chunk-based**: only chunks within an active radius around the
player are materialised and rendered; distant chunks unload. Chunk content is
fully deterministic from `(worldSeed, chunkX, chunkY)`, so only player-caused
changes (harvested nodes, buildings) are persisted rather than the whole world.

## 4. Time & Weather _(time done in Phase 1; weather Phase 10)_

- 1 game day = 24 real minutes; 1 game hour ≈ 1 real minute.
- Phases: dawn 05, sunrise 06, morning 08, midday 12, sunset 18, night 20,
  midnight 00. **Implemented** (clock + ambient darkness).
- Weather: clear, rain, storm, fog, wind — _Planned_.

## 5. Player & Survival _(Phase 1: movement/dodge; stats Phase 2/4)_

Stats: health, hunger, thirst, energy (all configurable in `BALANCE.survival`).

## 6. Controls (desktop) _(Implemented — Phase 1)_

| Action    | Key           |
| --------- | ------------- |
| Move      | WASD / Arrows |
| Sprint    | Shift         |
| Interact  | E             |
| Attack    | Left click    |
| Dodge     | Space         |
| Hotbar    | 1–5           |
| Inventory | I             |
| Crafting  | C             |
| Map       | M             |
| Pause     | Esc           |

## 7. Final Objective _(Phase 7/8)_

Build the Sailing Boat. On success, show **CHAPTER I COMPLETE — The Outer
Islands Await…** with _Continue Playing_ / _Return to Main Menu_.

## 8. Future Sections (to be filled as phases land)

Inventory, crafting, building, combat, wildlife, NPC, quests, skills, death,
save system — see `docs/TECHNICAL_DESIGN.md` and `docs/SAVE_SYSTEM.md` as they
are authored.
