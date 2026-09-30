# Game Data — Nusantara Survival

> **Status: GROWING.** Content is authored incrementally per phase. This document
> catalogues every data-driven definition and its schema.

## Principle

All content is **data-driven** and **typed**. Runtime logic reads definitions; it
never hardcodes item/recipe/quest specifics. Invalid data fails loudly (content
validation lands in Phase 8).

## Data Sets

| Set            | Location                  | Introduced |
| -------------- | ------------------------- | ---------- |
| Items          | `src/lib/data/items/`     | ✅ Phase 2 |
| Recipes        | `src/lib/data/recipes/`   | ✅ Phase 2 |
| Resource nodes | `src/lib/data/resources/` | ✅ Phase 2 |
| Buildings      | `src/lib/data/buildings/` | ✅ Phase 2 |
| Wildlife       | `src/lib/data/wildlife/`  | ⬜ Phase 6 |
| NPCs           | `src/lib/data/npc/`       | ⬜ Phase 7 |
| Quests         | `src/lib/data/quests/`    | ⬜ Phase 7 |
| Biomes         | `src/lib/data/biomes/`    | ⬜ Phase 3 |

## Items (`ItemDefinition`)

Schema in `src/lib/types/items.ts`. Key fields: `id` (stable), `name`,
`category`, `stackSize`, `weight`, `rarity`, `icon`, `tags`, optional `effects` /
`tool` / `weapon` / `armor`, and `questCritical` / `noDrop` for soft-lock safety.

Phase 2 items: wood, stone, fiber, coconut, hardwood, clay, herb, shell, berry,
cooked_berry, fish, cooked_fish, water_flask, stone_axe, stone_pickaxe,
stone_knife, fishing_rod, ancient_fragment.

## Recipes (`RecipeDefinition`)

Schema in `src/lib/data/recipes/index.ts`. `station`, `ingredients`, `outputs`,
`durationMs`, optional `unlock` / `skillRequirement`. Crafting is atomic.

## Resource Nodes (`ResourceNodeDefinition`)

Schema in `src/lib/data/resources/index.ts`. `work`, `yields`, `preferredTools`,
`respawn`, `solid`, `biome`. Harvest yields are rolled deterministically from the
world seed.

## Buildings (`BuildingDefinition`)

Schema in `src/lib/data/buildings/index.ts`. `size`, `requires`, `solid`, optional
`station` / `isRespawnAnchor` / `behaviour`. Placement is validated (range /
terrain / collision / spacing / materials).

## Balance

All gameplay numbers live in `src/lib/game/config/balance.ts` (`BALANCE`).
Never hardcode a gameplay number in a module.
