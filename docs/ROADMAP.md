# Roadmap — Nusantara Survival (Production V1.0)

Tracked against the master phase plan. Status is **honest**: only completed work
is marked done.

| Phase | Deliverable                                                                                     | Status  |
| ----- | ----------------------------------------------------------------------------------------------- | ------- |
| 0     | Repository audit                                                                                | ✅ done |
| 1     | Foundation: SvelteKit+TS+Phaser boot, event bridge, config, movement, camera, desktop input     | ✅ done |
| 2     | Vertical slice: map, resource, gather, inventory, craft, survival, campfire, shelter, save/load | ✅ done |
| 3     | World: chunk manager, deterministic seed, 3 biomes, spawning, persistence                       | ✅ done |
| 4     | Player systems: survival, energy, equipment, tools, durability, hotbar, death/respawn           | ✅ done |
| 5     | Full crafting & building architecture                                                           | ✅ done |
| 6     | Combat & wildlife (FSM, loot)                                                                   | ✅ done |
| 7     | NPC & quest (schedule, dialogue, main progression)                                              | ✅ done |
| 8     | Content population + validation                                                                 | ✅ done |
| 9     | Mobile controls & responsive UI                                                                 | ✅ done |
| 10    | Audio & polish                                                                                  | ✅ done |
| 11    | Persistence hardening (migration, backup, import/export, corruption)                            | ✅ done |
| 12    | PWA / offline                                                                                   | ✅ done |
| 13    | Testing expansion                                                                               | ✅ done |
| 14    | Optimization                                                                                    | ✅ done |
| 15    | Release candidate                                                                               | ✅ done |

## Phase 1 Acceptance Criteria (met)

- `npm run dev` boots the SvelteKit app → main menu → Play → game route.
- Phaser initialises client-side only (no SSR errors).
- Player moves with WASD/arrows via the abstract action layer.
- Camera follows the player smoothly.
- Typed event bridge drives the Svelte HUD (clock/phase from the simulation).
- Central `BALANCE` config; no scattered gameplay numbers.
- `check`, `lint`, `test:unit`, `build`, `test:e2e` all pass.

## Phase 2 Acceptance Criteria (met)

- Deterministic seeded map with resource nodes (`generateWorld`, unit-tested).
- Gathering with tools + durability, yields into the inventory, toast feedback.
- Transactional inventory (add/remove/move/split/serialize) — 17 unit tests.
- Data-driven crafting (hand + campfire), atomic consume/produce — 8 unit tests.
- Survival stats tick from the simulation clock; consume food/drink.
- Save/load via IndexedDB: atomic write, backups, import/export, migration stub.
- Menu "Lanjutkan" loads the most recent save.
- `check`, `lint`, `test:unit` (101 tests), `build`, `test:e2e` (2) all pass.

## Phase 3 Acceptance Criteria (met)

- Chunk-based world manager: only chunks within the active radius are materialised.
- Deterministic generation from (worldSeed, chunkX, chunkY) — unit-tested.
- Three biomes (tropical_coast / rainforest / highlands) arranged as concentric
  bands from the coast to the highlands, with seeded edge jitter.
- Per-biome resource spawning via weighted tables.
- Biome transition detection with a "discovered" toast + HUD biome indicator.
- Chunk state persists: harvested node ids survive save/load; distant chunks
  unload and their sprites are destroyed (memory-bounded cache).
- `check`, `lint`, `test:unit` (110 tests), `build`, `test:e2e` (2) all pass.

## Phase 4 Acceptance Criteria (met)

- Equipment model: 5-slot hotbar with active-slot selection (keys 1–5 + click).
- Tool/weapon durability tracked on held items; tools break at zero durability.
- Four weapon families defined in data (spear, bow, machete, sword).
- Death → non-critical inventory dropped as a **recoverable backpack**;
  quest-critical / no-drop items are never dropped (soft-lock prevention).
- Respawn at the last anchor (bed/shelter) with configured stats; backpack
  recovery via interaction.
- Hotbar UI + death overlay wired to the event bridge.
- `check`, `lint`, `test:unit` (127 tests), `build`, `test:e2e` (2) all pass.

## Phase 5 Acceptance Criteria (met)

- Full crafting architecture: 20 recipes across 5 stations (`hand`, `campfire`,
  `workbench`, `cooking_station`, `boat_workshop`), with `unlock` (visibility)
  and `skillRequirement` (craft-time) gates.
- Full building set: 14 buildings (campfire, shelter, bed, storage, workbench,
  cooking station, water collector, farm plot, fence, torch, house, fishing
  dock, boat workshop, dock) with footprints, materials, station provision,
  respawn anchors and skill-based unlocks.
- Crafting is **station-aware**: `GameState.reachableStations()` resolves which
  stations are in range from the player position; recipes fail cleanly with
  actionable reasons (missing station / skill / ingredients).
- Placement preview: `BuildController` ghosts the footprint at the snapped tile,
  tinted valid/invalid, with R to rotate and Esc/right-click to cancel; all
  rules delegate to the pure `validatePlacement` (incl. the new `locked` issue).
- Placed buildings persist, render, and can be removed; `buildingAt()` resolves
  the building under a position.
- Skills & XP system: 5 skills (gathering/crafting/survival/combat/fishing),
  xp→level curve from `BALANCE.xp`, awarded on harvest/craft, persisted.
- Content validation harness (`validateContent`) fails loudly on duplicate item
  ids, unknown recipe/building/resource references, and runs at startup in dev.
- Skills + build panels wired to the event bridge (`B`, `K` shortcuts).
- `check`, `lint`, `test:unit` (165 tests), `build`, `test:e2e` (2) all pass.

## Phase 6 Acceptance Criteria (met)

- Combat domain (`systems/combat.ts`): attack resolution (unarmed/weapon,
  light/heavy, cooldown from attack speed, energy cost, criticals, durability),
  damage application (armor reduction, knockback, invuln), and a full creature
  AI state machine (idle/patrol/chase/attack/flee/dead).
- Four behaviour archetypes drive AI from data: passive, skittish, territorial,
  predator.
- Wildlife content: 7 species across all three biomes (crab, seagull, boar,
  monkey, snake, hawk, tiger) with combat + AI + weighted loot tables.
- Wildlife manager (`systems/wildlife.ts`): bounded spawn/despawn around the
  player (biome-biased, deterministic RNG), AI stepping, hit resolution, reaping.
- Combat integrated into GameState: `attack`/`heldWeapon`/`damagePlayer`/
  `grantLoot`/`recordCombatHit`, weapon durability consumption, combat XP.
- Engine: `CreatureRenderer` (per-creature sprite + health bar),
  `WorldScene` wildlife loop, player attacks via mouse/F/G, player damage with
  knockback + i-frames + camera shake, damage-flash overlay.
- New loot items (meat, hide, feather, boar tusk, venom sac, tiger fang) and a
  cook-meat campfire recipe; content validation extended to creatures/biome
  wildlife cross-references.
- `check`, `lint`, `test:unit` (197 tests), `build`, `test:e2e` (3) all pass.

## Phase 7 Acceptance Criteria (met)

- NPC content (`data/npcs/`): 4 NPCs (Pak Ujang the fisher, Ibu Sari the forest
  keeper, Ronggo the highland miner, the Ancestor Spirit) with biome, texture,
  deterministic anchor, an hourly schedule, and a data-driven dialogue tree.
- NPC runtime (`systems/npcs.ts`): met/relationship tracking, additive
  relationship with clamping, relationship tiers (stranger→ally), schedule-aware
  `positionAt`/`activityAt`, nearest-NPC query, and serialize/deserialize.
- Quest content (`data/quests/`): 5 chained quests forming the **Chapter I** arc
  (`chapter1_start → chapter1_gather / chapter1_iron → chapter1_hunt →
chapter1_boat`), each with typed objectives (gather/craft/build/defeat/reach/
  talk/flag), prerequisites, and rewards (items, skill xp, relationship).
- Pure quest engine (`systems/quests.ts`): explicit state machine
  `LOCKED → AVAILABLE → ACTIVE → COMPLETABLE → COMPLETED`, snapshot-based
  objective evaluation (`WorldSnapshot`), prune-on-turn-in item consumption, and
  a `QuestLog` that unlocks chained quests on completion.
- Integration into `GameState`: per-item `craftedCounts`, per-creature
  `defeatedCounts`, visited biomes, talked NPCs; `refreshQuests/acceptQuest/
turnInQuest/talkToNpc/visitBiome/activeQuests`; rewards granted atomically
  (items, skill xp, relationship) and consumed items spent on turn-in.
- New highlands resource node `ruin_cache` yields `ancient_fragment` (quest
  item), wired into the highlands biome spawn table.
- Engine: `NpcRenderer` draws + schedule-syncs NPC sprites each frame;
  `WorldScene` gives NPCs interaction priority, opens dialogue (`E`), and
  suppresses interaction while a conversation is open.
- UI: `DialoguePanel` (lines + choices + quest accept), `QuestTracker` (live HUD
  objectives), `QuestLogPanel` (`J`, turn-in + rewards), `ChapterCompleteOverlay`
  emitted when the final quest completes.
- Existing save schema extended: `WorldSave` now carries quest-progress counters;
  quests/NPCs serialize into the existing `quests`/`npcs` save arrays.
- Content validation extended: NPC biome/dialogue-target checks and quest
  giver/prerequisite/objective-target/reward checks all fail loudly.
- `check`, `lint`, `test:unit` (225 tests), `build`, `test:e2e` (4) all pass.

## Phase 8 Acceptance Criteria (met)

- Content catalogue expanded to the full **V1 set**:
  - **Items (71)**: added tier-2 refined materials (rope, cloth, charcoal, steel
    ingot, glass, leather), raw resources (bamboo, salt, sand, mushroom, gold
    ore/ingot, croc hide, wolf pelt), consumables (mushroom soup, salted fish,
    bandage, antidote), weapons (iron spear, hunting bow, steel sword), tools
    (iron knife, gold hoe, lantern), a full **armor set** (fiber tunic, leather,
    iron, croc), ammo/farming (arrow, seed, fertilizer) and treasure (pearl
    necklace).
  - **Resources (20)**: added salt flat, sand bank, bamboo grove, mushroom patch,
    gold vein, fish shoal, oyster bed — closing the previously-unobtainable
    `fish` and `pearl` gaps.
  - **Creatures (9)**: added the coastal crocodile (territorial ambusher) and the
    highland wolf (pack predator), both with unique loot.
  - **Recipes (46)**: full refining chain (rope→cloth→leather→steel), tier-2
    gear, ammunition, farming and medicine, all with `unlock`/skill gates.
  - **Buildings (20)**: added drying rack, watchtower, garden lamp, rain catcher,
    large storage chest and well.
- Every new entry is wired into the biome spawn tables (resources + wildlife).
- Content validation extended with regression breadth guards and obtainability
  checks: every item must be produced by a recipe, yielded by a node, or dropped
  by a creature; every non-hand station must be provided by a building.
- Test-only gameplay driver (`?e2e=1`) exposes a minimal opt-in API for driving
  progression; never active during normal play.
- E2E main progression: drives all five Chapter I quests end-to-end and asserts
  the **CHAPTER I COMPLETE** ending overlay appears (`progression.e2e.ts`).
- `check`, `lint`, `test:unit` (228 tests), `build`, `test:e2e` (5) all pass.

## Phase 9 Acceptance Criteria (met)

- **Controls bridge** (`game/input/controls-bridge.ts`): engine-agnostic singleton
  the world scene registers on boot and clears on teardown; exposes `setMove`,
  `press` and `setHeld`, so on-screen controls feed the same abstract action map
  as the keyboard. No Phaser import in the bridge.
- **`PhaserInput`** gains `synthHold` for held actions (sprint) alongside the
  existing `synthPress`/`setVirtualMove`; virtual joystick input overrides the
  keyboard movement vector when active.
- **Device store** (`stores/device.svelte.ts` + pure `device-helpers.ts`): detects
  touch capability (`maxTouchPoints` / coarse pointer), orientation, standalone
  (PWA) mode and small viewports, updating live on resize/orientationchange.
- **`MobileControls`** component: draggable virtual joystick (pointer capture,
  normalised vector, full-deflection = full speed) plus discrete action buttons
  (attack, heavy, interact, dodge, sprint-hold, build). Suspended automatically
  whenever any panel is open so the player never drifts.
- **`RotateHint`**: portrait phone overlay asking the player to rotate for the
  intended landscape experience.
- **Responsive play HUD**: on touch devices the keyboard hint bar is replaced by
  the on-screen controls and the top bar respects `env(safe-area-inset-*)`.
- **Setting**: `touchControls` (auto / always / never) added to the settings store
  and a "Kontrol" section in the settings page; explicit choice overrides
  auto-detection.
- Unit tests for the controls bridge routing and device helpers.
- E2E: touch-device joystick + action buttons render and are usable, and the
  portrait rotate hint shows (`mobile.e2e.ts`).
- `check`, `lint`, `test:unit` (239 tests), `build`, `test:e2e` (7) all pass.

## Phase 10 Acceptance Criteria (met)

- **Procedural audio (no asset files)**: `game/audio/sfx.ts` defines a catalogue of
  synth patches (waveform, frequency glide, ADSR envelope, gain, lowpass) — all
  sounds are generated at runtime with the Web Audio API. Zero third-party audio.
- **`AudioEngine`** (`game/audio/audio-engine.ts`): lazy `AudioContext` created on
  a user gesture (autoplay-policy compliant), separate master/sfx/music gain
  buses, voice cap, one-shot SFX scheduling, a procedural ambient pad with a slow
  detune drift (never loops), and clean `dispose()`.
- **`audio-manager.ts`**: single instance wiring the event bus to the engine.
  Data-driven event→sfx map (`audio-map.ts`) plus payload resolution (crit vs.
  hit, toast kind) and a generic `SFX` event for direct cues from systems.
- **Volume integration**: master/music/sfx volumes pushed from the settings store
  and re-applied live on change; a quick mute toggle in the play top bar;
  auto-mute while the tab is hidden.
- **New balance block** (`BALANCE.audio`): master ceiling, voice cap, music fade,
  footstep interval.
- **Polish**: camera shake now respects the `screenShake` setting, damage flash
  respects the `damageFlash` setting, and both respect reduced-motion — so the
  accessibility toggles actually do something.
- Unit tests: SFX catalogue consistency, event→sfx mapping, and full engine
  lifecycle against a fake Web Audio API.
- E2E: entering play initialises audio and gameplay/volume changes throw no
  errors (`audio.e2e.ts`).
- `check`, `lint`, `test:unit` (253 tests), `build`, `test:e2e` (8) all pass.

## Phase 11 Acceptance Criteria (met)

- **Versioned export envelope + integrity**: `save/integrity.ts` wraps every
  export in a self-describing envelope (`format`, `envelopeVersion`,
  `schemaVersion`, `exportedAt`) carrying a deterministic **FNV-1a checksum** of a
  canonical (key-sorted) JSON payload. Imports recompute the checksum, so
  corrupted or hand-edited files are rejected _before_ touching IndexedDB.
  Bare legacy saves (no envelope) are still accepted.
- **Real migration path**: schema bumped to **v2**; `MIGRATIONS[1]` backfills the
  new `statistics.deaths` stat and normalises `world.backpacks`. Migration is
  deterministic, non-destructive and chain-aware (a gap in the chain fails loudly).
- **Deep, content-aware validation** (`validateSaveFull`): checks every required
  field's type, player/inventory/world shapes, positive stack quantities, valid
  quest states and non-negative time. Referential drift (an item id no longer in
  the content tables) is surfaced as a **warning**, not a hard failure.
- **Corruption recovery** (`repairSave` + `loadSaveWithRecovery`): on a broken
  primary snapshot the loader walks backups newest-first, repairs what it can
  (drops unknown items, coerces bad numbers, backfills collections — never
  granting progression) and promotes the recovered snapshot back to primary with
  a visible "dipulihkan dari cadangan" notice.
- **Quota handling**: a failed write under quota pressure prunes derived backups
  and retries once; the error mapping in the session still surfaces a friendly
  message.
- **Save-slot manager UI** (`SaveSlotManager.svelte`): the menu now lists all
  slots with continue/inspect/restore-backup/delete, plus **export to file** and
  **import from file**. (Also fixed a latent bug: the `meta`/`saves` object
  stores use out-of-line keys, so every `put` now passes the explicit key —
  saves previously never appeared in the menu.)
- Unit tests: checksum stability/round-trip, envelope tamper rejection, v1→v2
  migration, deep validation and repair (32 save tests).
- E2E (`persistence.e2e.ts`): a played slot appears in the menu, exports to a
  checksummed file and re-imports cleanly; a tampered envelope is rejected.
- `check`, `lint`, `test:unit` (278 tests), `build`, `test:e2e` (10) all pass.

## Phase 12 Acceptance Criteria (met)

- **Web app manifest** (`static/manifest.webmanifest`): name/short_name, `standalone`
  display, `start_url: /`, `scope: /`, `theme_color`, and `any` + `maskable` icons.
- **Procedural icons** (`scripts/generate-icons.mjs`, `npm run icons`): a
  dependency-free Node script draws a sunrise-over-island mark and encodes real
  PNGs via `zlib`. Outputs (`192`, `512`, maskable `512`, apple-touch `180`,
  favicon `32`) are committed to `static/icons/`. No third-party image assets.
- **Hand-written service worker** (`static/sw.js`): precaches the app shell on
  install, **cache-first** for hashed `/_app/immutable/**` and `/icons/**`,
  **stale-while-revalidate** for the shell, **network-first with cache fallback**
  for navigations, and a `SKIP_WAITING`/version message channel. Old caches are
  purged on activate; `clients.claim()` takes control immediately.
- **Lifecycle store** (`$lib/pwa/sw-store.svelte.ts` + pure `sw-helpers.ts`):
  registers the worker (skipped in dev / insecure / unsupported), tracks
  offline-ready vs. update-waiting, and exposes `applyUpdate()`.
- **Offline UI** (`OfflineIndicator.svelte`): a global online/offline banner and
  a status pill ("Siap offline" / "Pembaruan tersedia") with a reload action.
  The About page also shows the current offline status and install hint.
- **`app.html`** wired with the manifest link, theme-color, apple-touch icon,
  `application-name`, `apple-mobile-web-app-*` and `viewport-fit=cover`.
- Unit tests: registration planning and status labelling (`sw-helpers.spec.ts`).
- E2E (`pwa.e2e.ts`): the manifest is served and all icons resolve as PNG; the
  service worker registers, controls the page and populates the cache; a reload
  with the network cut off still renders the shell; the offline banner appears.
- `check`, `lint`, `test:unit` (287 tests), `build`, `test:e2e` (13) all pass.

## Phase 13 Acceptance Criteria (met)

- **Input action-map tests** (`input/actions.spec.ts`): every binding maps to a
  known `InputAction`, keys are canonical lower-case, every core action is bound,
  each hotbar slot has a distinct key, and movement directions never collide.
- **Balance invariant tests** (`config/balance.spec.ts`): every numeric tunable is
  finite and non-negative; relationships that systems rely on are asserted
  (sprint > walk, dodge > sprint, heavy > light + slower, respawn within caps,
  thirst drain ≥ hunger, spawn radius < despawn distance, weather range ordered,
  biome coverage ≤ 1, monotonic xp curve, audio ceiling ≤ 1).
- **Headless full-loop integration** (`integration/full-loop.spec.ts`): a single
  continuous session through the pure core — gather → craft → build → survival
  over game time → death/backpack recovery/respawn → **save → JSON round-trip →
  reload**, asserting no progress loss on the fields that matter, plus
  determinism (same seed ⇒ same RNG stream) and skill-xp accrual.
- **Content referential-integrity tests** (`content/validation.spec.ts`): every
  node yield, biome resource/wildlife list, biome weight, creature loot entry,
  building cost, recipe ingredient/output, quest objective/reward and quest
  prerequisite resolves to known content with valid ranges; NPC dialogue quest
  references resolve; exactly one quest is the finale; ids are unique.
- **Save fuzzing + repair hardening** (`save/migration.spec.ts`): 200 randomized
  mutate→validate→migrate cycles, single-field deletion repair for every required
  collection, and a **real bug fix** — `repairSave` no longer crashes when
  `player`/`inventory`/`equipment`/`world` are missing; it recreates safe defaults.
- **New-player E2E** (`newplayer.e2e.ts`): drives the actual harvest/craft/build
  APIs, saves, leaves to the menu, and verifies the snapshot + summary are durably
  written to IndexedDB (contains the crafted axe and placed campfire) and that the
  slot still lists after a full reload.
- `check`, `lint`, `test:unit` (333 tests), `build`, `test:e2e` (14) all pass.

## Phase 14 Acceptance Criteria (met)

- **Bundle splitting** (`vite.config.ts`): Rolldown `codeSplitting.groups` isolates
  Phaser (and the rest of `node_modules`) into its own content-hashed chunk. The
  `/play` route entry dropped from **1,440.98 kB (378.78 kB gzip)** to
  **35.90 kB (11.76 kB gzip)**; the engine is a separate ~1.37 MB chunk that is
  cached independently, so app-code changes no longer invalidate it. The >500 kB
  build warning is gone.
- **Lazy engine load** (`GameCanvas.svelte`): Phaser + content validation are
  dynamically imported inside `onMount`, so the Svelte shell (HUD/panels) paints
  before the engine bundle is fetched/parsed. Errors still surface via `GAME_ERROR`.
- **Renderer hot paths** (`creature-renderer.ts`, `chunk-renderer.ts`):
  - creature sync is O(n) via a live `Set` (was O(n·m) `Array.includes`);
  - `ChunkRenderer.activeNodes()` returns a cached flat list, rebuilt only on
    chunk churn (was allocated every call from per-frame build/interaction probes);
  - `markHarvested()` is an O(1) map lookup (was a linear scan over all nodes).
- **Wildlife hot loop** (`wildlife.ts`): `despawnFar`/`reapDead` compact in place
  (no `Array.filter` garbage per spawn tick); `step` mutates the (shallow-shared)
  position object instead of reallocating it every frame; species lookup uses the
  O(1) `getBiome` accessor instead of a linear `BIOME_LIST.find`.
- **Biome memoization** (`chunk-manager.ts`): the 256px-cell jitter used by
  `biomeAt` is memoized (bounded), removing a `hashString` + PRNG per call on the
  per-frame biome/wildlife path. Determinism is preserved (unit-tested).
- **Tests added**: in-place compaction/liveness in `wildlife.spec.ts`, and
  memoized-jitter stability in `chunk-manager.spec.ts` (337 unit total).
- `check`, `lint`, `test:unit` (337 tests), `build`, `test:e2e` (14) all pass.

## Phase 15 Acceptance Criteria (met)

- **Build metadata** (`vite.config.ts` + `config/version.ts`): `VITE_BUILD_ID` is
  resolved at build time from the Vercel/GitHub commit sha, then the local git
  short sha, then a timestamp — never the stale `'dev'` constant. Surfaced in
  **About**.
- **Controls reference** (`input/controls-reference.ts` + Settings): a pure helper
  derives the human-readable key map directly from `ACTION_BINDINGS` (so it can
  never drift), folds the hotbar into a `1–5` row and shows movement aliases
  (`W / ↑`). Rendered as a "Peta Tombol" section on `/settings`.
- **Version guard** (`config/version.spec.ts`): asserts `GAME_VERSION` equals
  `package.json` version, is a semver triple, and schema version is a positive
  integer.
- **Deploy config** (`vercel.json`): security headers (`nosniff`, `DENY`,
  `Referrer-Policy`, `Permissions-Policy`); `/sw.js` → `must-revalidate`;
  `/_app/immutable/**` → `immutable`; manifest served as
  `application/manifest+json`.
- **Release E2E** (`release.e2e.ts`): About shows real version + non-`dev` build
  id; Settings renders the live key map; static assets advertise correct
  caching/content types.
- **E2E determinism hardening** (`tests/e2e/helpers.ts`): the app is SSR'd, so
  clicking a menu button before hydration is a no-op, and the lazily-loaded
  engine can swallow early keypresses. Two markers — `html[data-hydrated="true"]`
  (`+layout.svelte`) and `.game-root[data-engine-ready="true"]` (`GameCanvas`)
  plus `startNewGame()` / `ensureServiceWorkerControl()` helpers — replace fixed
  sleeps with a real readiness contract (the SW helper reloads until controlled,
  since we never call `clients.claim()`). Verified across **multiple consecutive
  full green runs (18/18)**.
- **Fully-static deploy** (`src/routes/+layout.ts`): `prerender = true` at the
  root makes `/`, `/about` and `/settings` static HTML (no serverless functions,
  no cold starts); `/play` stays `ssr = false` but is still prerendered to a
  hydrating shell. Verified in `.vercel/output`.
- **Offline-first game** (`static/sw.js`, `pwa.e2e.ts`): `/play` is precached, and
  a new E2E proves the **game boots fully offline** after the first visit (engine
  chunks served from cache with the network cut).
- **Release docs** (`docs/RELEASE.md`): deploy target, pre-release gate, manual
  smoke test, known non-blocking items, versioning policy.
- `check`, `lint`, `test:unit` (347 tests), `build`, `test:e2e` (18) all pass.

## Post-release: Visual Overhaul

The placeholder world read as a flat, near-black field of coloured dots. Replaced
it with recognizable, layered programmatic pixel art — still 100% original, still
no external assets:

- **Sprite system** (`core/art.ts` + `core/sprites.ts`): reusable pixel-drawing
  primitives (bordered balls, faceted polygons, shaded gradients, colour
  mix/shade) drive ~25 distinct sprites — broadleaf/pine/palm/bamboo trees,
  boulder + iron/gold ore veins, berry/herb/mushroom/rare-plant bushes, shell
  piles, fish, and nine creatures (crab, seagull, hawk, boar, monkey, snake,
  tiger, crocodile, wolf) plus a shaded player and per-NPC tinted villagers.
  `resourceTexture(id)` / `creatureTexture(id)` map each content id to its art.
- **Textured ground** (`world/chunk-renderer.ts`): each chunk's ground is painted
  once into an offscreen `Graphics` and **baked into a static texture**
  (`generateTexture`) shown as a single `Image` — a biome base, soft organic
  patches, scattered blades, and clumped grass tufts. Baking was essential: a
  live `Graphics` holding thousands of draw commands is re-tessellated every
  frame, which stalled the game to ~5 fps; baked textures run at 60 fps and
  never repeat the work. Textures are freed when a chunk leaves the active set.
- **Seamless biome borders** (`chunk-manager.ts` `groundTintAt`): the ground
  colour is linearly blended across biome-band edges (instead of snapping at
  `biomeAt`), so coast↔rainforest↔highlands fade into one another. All ground
  jitter/patches/tufts are seeded from **world** coordinates, so a patch
  spanning a chunk border is drawn identically by both chunks — no visible
  chunk grid anywhere.
- **Populated world** (`BALANCE.world`): landmark props (trees, ore, ruins) are
  scaled to ~1.5 tiles tall (`nodeSpriteScale`, keyed by resource type) and node
  density raised to 14–20 per chunk (`nodeDensityMin/Max`, `nodeMinSpacing`), so
  the island reads as a living place rather than a sparse field of dots — all
  tunable from `BALANCE` without code changes.
- **Readable lighting** (`WorldScene.ts`): the old full-world `MULTIPLY` overlay
  that blackened the map is now a gentle, camera-fixed ambient tint (nights dim
  to ~0.42, never black). Biome ground colours were lightened so day is clearly
  readable.
- **Y-sorting**: world objects (player, nodes, creatures, NPCs, buildings) use
  their world-Y as depth so tall sprites overlap correctly; the build ghost and
  ambient overlay sit above.
- **Fixes found during verification**:
  - New games now spawn on the **tropical coast** (as the code comments always
    intended) instead of the highland centre.
  - The HUD biome label no longer shows a stale "Pesisir Tropis" default — the
    initial `BIOME_CHANGED` is emitted on scene start.
  - E2E `workers` capped at 2 (each test boots a WebGL canvas; one-per-core
    exhausted the GPU/context pool and crashed browser sessions).
  - **Ground render stall fixed**: a live per-chunk `Graphics` was re-tessellated
    every frame, dropping the game to ~5 fps (measured 3–9). Baking each chunk's
    ground into a static texture restored a steady **60 fps** on GPU (and ~6×
    faster even under software rendering).

Verified with real screenshots (Playwright) and two consecutive full green E2E
runs. `check`, `lint`, `test:unit` (347), `build`, `test:e2e` (18) all pass.

## Post-release: Polish & Live-ness Pass

A second polish round after the visual overhaul, aimed at making the world feel
alive and the project ship-ready. All engine-free layering preserved; still zero
external assets.

- **Distinct node art** (`core/sprites.ts`): node types that previously shared
  the boulder sprite now have their own painters — a clay mound (rounded, dug
  top), a cracked salt flat, a rippled sand bank, a mossy ruin cache with a
  chest niche, and a clustered oyster bed. Players can now tell resources apart
  at a glance.
- **Game feel** (`world/feedback.ts`, presentation-only): floating damage/loot
  numbers and short impact particle bursts on attacks, incoming hits, and
  harvests. All amplitudes/timings live in `BALANCE.feedback`.
- **Idle animation** (`world/animation.ts`, pure + unit-tested): a gentle sine
  "bob" applied to creatures and NPCs (each with a stable per-entity phase so
  they don't move in lockstep) and a subtle idle "breath" scale on the player
  that never touches its physics body.
- **Skill level-ups surfaced** (`systems/skills.ts`): `Skills.award()` records
  level-ups, drained by the scene to emit `SKILLS_CHANGED` + `SKILL_LEVEL_UP`
  (new `level_up` SFX) and a toast. `SKILLS_CHANGED` was declared but never
  emitted before; `SKILL_LABELS` is now the single source of truth (was
  duplicated in the HUD).
- **Inventory QoL** (`core/inventory.ts` + `InventoryPanel`): a pure `sortSlots`
  (category → rarity → name → durability) behind a "Rapikan" tidy button, plus
  drag-and-drop reorder/merge between slots.
- **Mobile texture memory** (`chunk-renderer.ts`): the per-chunk ground bake now
  renders at `BALANCE.world.groundBakeScale` (default 0.5 → 512², ~1 MB/chunk)
  via a downscale blit, cutting ground VRAM ~4× for low-end devices.
- **Accessibility** (`world/feedback.ts`, renderers, `WorldScene`): reduced
  motion now suppresses particles/bob and holds floating numbers in place
  (previously only screen shake and damage flash honoured the setting).
- **Performance guard** (`tests/e2e/perf.e2e.ts`): samples a same-browser rAF
  baseline, then asserts the game runs at a healthy fraction of it — catching a
  render stall like the ~5 fps ground bug without a brittle absolute floor.
- **CI** (`.github/workflows/ci.yml`): lint + svelte-check + unit + build, then
  a Playwright E2E job. Green on GitHub Actions.

Gate after this pass: `check`, `lint`, `test:unit` (366), `build`, `test:e2e`
(19) all pass.
