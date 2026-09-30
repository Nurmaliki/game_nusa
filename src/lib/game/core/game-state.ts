import { GameClock } from '../systems/game-clock';
import {
	DEFAULT_CAPS,
	initialStats,
	type SurvivalCaps,
	type SurvivalStats,
	tickSurvival,
	applyEffects,
	respawnStats,
	type TickContext
} from '../systems/survival';
import { Inventory } from './inventory';
import { getItem } from '$data/items';
import { getResourceNode } from '$data/resources';
import { getBuilding } from '$data/buildings';
import { craft as craftRecipe, type CraftContext } from '../crafting/crafting';
import { applySwing, rollYield } from '../systems/gathering';
import { mergeBackpack, selectBackpackDrop, type Backpack } from '../systems/backpack';
import {
	resolveAttack,
	applyDamageToPlayer,
	rollLoot,
	type AttackKind,
	type AttackResult
} from '../systems/combat';
import type { LootEntry } from '$data/creatures';
import { Equipment } from './equipment';
import { Skills } from '../systems/skills';
import {
	QuestLog,
	emptySnapshot,
	consumedItems,
	type WorldSnapshot,
	type QuestProgress
} from '../systems/quests';
import { NpcRegistry } from '../systems/npcs';
import type { QuestDefinition } from '$data/quests';
import {
	reachableStations,
	nearestRespawnAnchor,
	type PlacedBuilding
} from '../building/building-manager';
import type { GameSave, PlayerSave, WorldSave } from '$types/save';
import { CURRENT_SCHEMA_VERSION } from '$types/save';
import { GAME_VERSION } from '../config/version';
import type { ItemStack, WeaponDefinition } from '$types/items';
import type { BiomeId, Vec2, WeatherId } from '$types/core';
import { ok, err, type Result } from '$types/core';
import { BALANCE } from '../config/balance';

const itemLookup = (id: string) => getItem(id);

export interface BuildingInstance {
	id: string;
	definitionId: string;
	position: Vec2;
	rotation: number;
	state: Record<string, unknown>;
}

/**
 * Central, engine-agnostic game state (see §29 / §60).
 * Owns inventory, survival, clock, buildings and world flags; serializes to a
 * GameSave DTO. Phaser scenes read/mutate this; Svelte observes via events.
 */
export class GameState {
	saveId: string;
	worldSeed: number;
	createdAt: number;
	updatedAt: number;
	gameVersion = GAME_VERSION;

	clock: GameClock;
	stats: SurvivalStats;
	caps: SurvivalCaps = DEFAULT_CAPS;
	inventory: Inventory;
	equipment: Equipment;
	skills: Skills;
	quests: QuestLog;
	npcs: NpcRegistry;

	player: PlayerSave;
	buildings: BuildingInstance[] = [];
	backpacks: Backpack[] = [];
	world: WorldSave;
	weather: WeatherId = 'clear';
	chapterComplete = false;

	/** Per-item craft counts (for quest objectives). */
	private craftedCounts: Record<string, number> = {};
	/** Per-creature defeat counts (for quest objectives). */
	private defeatedCounts: Record<string, number> = {};
	/** Biomes the player has visited. */
	private visitedBiomes = new Set<string>();
	/** NPCs the player has talked to. */
	private talkedNpcs = new Set<string>();

	statistics = {
		itemsGathered: 0,
		itemsCrafted: 0,
		buildingsBuilt: 0,
		enemiesDefeated: 0,
		questsCompleted: 0,
		deaths: 0,
		playTimeMs: 0
	};

	/** Resource nodes harvested this session: nodeId -> remaining work. */
	private nodeWork = new Map<string, number>();
	/** Harvested node ids pending respawn: nodeId -> in-game time of harvest. */
	private harvestedAt = new Map<string, number>();
	/** Fast lookup of fully-harvested node ids (kept in sync with world save). */
	private harvestedSet = new Set<string>();

	constructor(saveId: string, worldSeed: number, now: number) {
		this.saveId = saveId;
		this.worldSeed = worldSeed;
		this.createdAt = now;
		this.updatedAt = now;
		this.clock = new GameClock(BALANCE.dayNight.startHour * (BALANCE.dayNight.msPerGameDay / 24));
		this.stats = initialStats();
		this.inventory = new Inventory(24, 5);
		this.equipment = new Equipment(this.inventory.hotbarSize);
		this.skills = new Skills();
		this.quests = new QuestLog();
		this.npcs = new NpcRegistry();
		this.player = {
			position: { x: 0, y: 0 },
			biome: 'tropical_coast',
			health: this.stats.health,
			hunger: this.stats.hunger,
			thirst: this.stats.thirst,
			energy: this.stats.energy,
			respawnPoint: null,
			isDead: false
		};
		this.world = { seed: worldSeed, chunkModifications: {}, harvestedNodes: [] };
	}

	/** Give the player a starting kit so survival isn't impossible. */
	seedNewGame(): void {
		this.inventory.add({ id: 'wood', qty: 5 }, getItem('wood')!);
		this.inventory.add({ id: 'berry', qty: 3 }, getItem('berry')!);
	}

	// ── Survival ─────────────────────────────────────────────────────────

	/** Advance survival by the given real delta ms (accounts for pause). */
	advanceSurvival(deltaMs: number, ctx: Omit<TickContext, 'gameHours'>): void {
		const gameHours = deltaMs / (BALANCE.dayNight.msPerGameDay / 24);
		this.stats = tickSurvival(this.stats, this.caps, { ...ctx, gameHours });
		this.syncPlayerFromStats();
	}

	consume(itemId: string): Result<void, string> {
		const def = getItem(itemId);
		if (!def) return err('unknown item');
		if (def.category !== 'food' && def.category !== 'drink' && def.category !== 'consumable') {
			return err('not consumable');
		}
		if (!this.inventory.has(itemId, 1)) return err('none in inventory');
		this.inventory.remove(itemId, 1);
		if (def.effects) this.stats = applyEffects(this.stats, this.caps, def.effects);
		this.syncPlayerFromStats();
		return ok(undefined);
	}

	private syncPlayerFromStats(): void {
		this.player.health = this.stats.health;
		this.player.hunger = this.stats.hunger;
		this.player.thirst = this.stats.thirst;
		this.player.energy = this.stats.energy;
	}

	/** Overwrite survival stats and mirror them to the player DTO (used by tests/UI). */
	setStats(next: Partial<SurvivalStats>): void {
		this.stats = { ...this.stats, ...next };
		this.syncPlayerFromStats();
	}

	// ── Gathering ────────────────────────────────────────────────────────

	/** Hotbar slots (first N inventory slots) as the held-item source. */
	private hotbarSlots(): (ItemStack | null)[] {
		const all = this.inventory.toArray();
		return all.slice(0, this.inventory.hotbarSize);
	}

	/** The tool/weapon the player currently holds, per the active hotbar slot. */
	activeTool(): ItemStack | null {
		return this.equipment.heldItem(this.hotbarSlots());
	}

	/** Inventory slot index of the currently held item (always the active slot). */
	private activeToolSlot(): number {
		return this.equipment.activeSlot;
	}

	/**
	 * Perform one gather swing on a node type. Returns yield stacks when the node
	 * completes. Updates harvested tracking for persistence.
	 */
	harvest(nodeId: string, nodeInstanceId: string): Result<ItemStack[], string> {
		const node = getResourceNode(nodeId);
		if (!node) return err('unknown node');

		const slotIndex = this.activeToolSlot();
		const toolStack = slotIndex >= 0 ? this.inventory.get(slotIndex) : null;
		const toolDef = toolStack ? (getItem(toolStack.id)?.tool ?? null) : null;

		const currentWork = this.nodeWork.get(nodeInstanceId) ?? node.work;
		const result = applySwing(node, currentWork, toolDef);

		// Consume tool durability immediately on a successful swing.
		if (toolStack && toolDef && result.durabilityCost > 0 && slotIndex >= 0) {
			const remaining = Math.max(
				0,
				(toolStack.durability ?? toolDef.durability) - result.durabilityCost
			);
			if (remaining <= 0) {
				this.inventory.set(slotIndex, null); // tool broke
			} else {
				this.inventory.set(slotIndex, { ...toolStack, durability: remaining });
			}
		}

		if (!result.completed) {
			this.nodeWork.set(nodeInstanceId, result.workRemaining);
			return ok([]);
		}

		this.nodeWork.delete(nodeInstanceId);
		const yields = rollYield(node, () => this.seededRandom(nodeInstanceId));

		const added: ItemStack[] = [];
		for (const y of yields) {
			const def = getItem(y.itemId);
			if (!def) continue;
			const r = this.inventory.add({ id: y.itemId, qty: y.qty }, def);
			if (r.ok) {
				added.push({ id: y.itemId, qty: y.qty });
				this.statistics.itemsGathered += y.qty;
			}
		}

		if (node.respawn.mode === 'after_hours') {
			this.harvestedAt.set(nodeInstanceId, this.clock.dayFraction * 24);
			this.markNodeHarvested(nodeInstanceId);
		}
		if (added.length > 0) this.skills.award('gathering', BALANCE.skills.gatherXpPerHarvest);
		return ok(added);
	}

	/** True if a node instance still has remaining work (not yet completed). */
	nodeHasWork(nodeInstanceId: string): boolean {
		return this.nodeWork.has(nodeInstanceId);
	}

	/** True if a node has been fully harvested (persisted). */
	isNodeHarvested(nodeInstanceId: string): boolean {
		return this.harvestedSet.has(nodeInstanceId);
	}

	/** Record a fully-harvested node id (persisted via world.harvestedNodes). */
	markNodeHarvested(nodeInstanceId: string): void {
		if (!this.harvestedSet.has(nodeInstanceId)) {
			this.harvestedSet.add(nodeInstanceId);
			if (!this.world.harvestedNodes.includes(nodeInstanceId)) {
				this.world.harvestedNodes.push(nodeInstanceId);
			}
		}
	}

	// ── Combat ───────────────────────────────────────────────────────────

	/** The equipped/held weapon definition, if the active slot holds a weapon. */
	heldWeapon(): WeaponDefinition | null {
		const held = this.activeTool();
		if (!held) return null;
		return getItem(held.id)?.weapon ?? null;
	}

	/**
	 * Resolve a player attack at the given target. Consumes energy and weapon
	 * durability. Returns the concrete damage/cooldown numbers and the target's
	 * resulting health. Does NOT apply the damage to a creature — the caller
	 * owns creature state — but returns `targetHealth`.
	 */
	attack(
		target: Vec2,
		kind: AttackKind,
		rng: () => number
	): Result<{ result: AttackResult; targetHealth?: number }, string> {
		const weapon = this.heldWeapon();
		const range = weapon?.range ?? BALANCE.combat.unarmedRange;
		const dist = Math.hypot(target.x - this.player.position.x, target.y - this.player.position.y);
		if (dist > range) return err('out_of_range');

		const res = resolveAttack({ kind, weapon, combatLevel: this.skills.level('combat') }, rng);

		if (res.energyCost > 0 && this.stats.energy < res.energyCost) return err('no_energy');
		if (res.energyCost > 0) this.setStats({ energy: this.stats.energy - res.energyCost });

		// Consume weapon durability in the active slot.
		this.consumeWeaponDurability(res.durabilityCost);

		return ok({ result: res });
	}

	/** Apply the durability cost to the held weapon; break it at zero. */
	private consumeWeaponDurability(amount: number): void {
		if (amount <= 0) return;
		const slot = this.activeToolSlot();
		const stack = this.inventory.get(slot);
		if (!stack) return;
		const def = getItem(stack.id);
		if (!def?.weapon) return;
		const current = stack.durability ?? def.weapon.durability;
		const next = current - amount;
		if (next <= 0) {
			this.inventory.set(slot, null);
		} else {
			this.inventory.set(slot, { ...stack, durability: next });
		}
	}

	/**
	 * Damage the player from a source, applying armor reduction and knockback.
	 * Returns the knockback impulse for the scene to apply.
	 */
	damagePlayer(amount: number, from: Vec2, knockback = 0): Vec2 {
		const armor = this.equipment.armorReduction((id) => getItem(id));
		const result = applyDamageToPlayer(
			this.stats.health,
			amount,
			armor,
			from,
			this.player.position,
			knockback
		);
		this.setStats({ health: result.health });
		return result.knockback;
	}

	/** Award loot from a killed creature and record the kill. */
	grantLoot(table: LootEntry[], rng: () => number, creatureId?: string): ItemStack[] {
		const drops = rollLoot(table, rng);
		const added: ItemStack[] = [];
		for (const d of drops) {
			const def = getItem(d.id);
			if (!def) continue;
			const r = this.inventory.add(d, def);
			if (r.ok) added.push(d);
		}
		this.statistics.enemiesDefeated += 1;
		if (creatureId) this.defeatedCounts[creatureId] = (this.defeatedCounts[creatureId] ?? 0) + 1;
		this.skills.award('combat', BALANCE.skills.huntXpPerKill);
		this.refreshQuests();
		return added;
	}

	/** Record a combat hit for skill progression (small xp per hit). */
	recordCombatHit(): void {
		this.skills.award('combat', BALANCE.skills.combatXpPerHit);
	}

	// ── Crafting ─────────────────────────────────────────────────────────

	craft(recipeId: string, ctx: CraftContext): Result<ItemStack[], { reason: string }> {
		const r = craftRecipe(this.inventory, recipeId, ctx, itemLookup);
		if (r.ok) {
			const total = r.value.reduce((a, s) => a + s.qty, 0);
			this.statistics.itemsCrafted += total;
			for (const out of r.value) {
				this.craftedCounts[out.id] = (this.craftedCounts[out.id] ?? 0) + out.qty;
			}
			this.skills.award('crafting', BALANCE.skills.craftXpPerCraft);
			this.refreshQuests();
			return ok(r.value);
		}
		return err(r.error as { reason: string });
	}

	/** Craft using the player's current position to resolve reachable stations. */
	craftAt(recipeId: string): Result<ItemStack[], { reason: string }> {
		return this.craft(recipeId, this.craftContext());
	}

	/** Build a CraftContext from the player's position + skills. */
	craftContext(): CraftContext {
		return {
			availableStations: this.reachableStations(),
			skills: this.skills.toRecord()
		};
	}

	/** Crafting station ids reachable from the player's current position. */
	reachableStations(): Set<string> {
		return reachableStations(this.buildings as PlacedBuilding[], this.player.position);
	}

	// ── Quests & NPCs ────────────────────────────────────────────────────

	/** Snapshot of world state used to evaluate quest objectives. */
	questSnapshot(): WorldSnapshot {
		const snap = emptySnapshot();
		for (const slot of this.inventory.toArray()) {
			if (!slot) continue;
			snap.counts[slot.id] = (snap.counts[slot.id] ?? 0) + slot.qty;
		}
		snap.crafted = { ...this.craftedCounts };
		snap.defeated = { ...this.defeatedCounts };
		for (const b of this.buildings) {
			snap.built[b.definitionId] = (snap.built[b.definitionId] ?? 0) + 1;
		}
		snap.visited = new Set(this.visitedBiomes);
		snap.talked = new Set(this.talkedNpcs);
		return snap;
	}

	/** Re-evaluate quest objectives and refresh availability. */
	refreshQuests(): void {
		this.quests.refreshAvailability();
		this.quests.update(this.questSnapshot());
	}

	acceptQuest(id: string): Result<void, string> {
		const r = this.quests.accept(id);
		if (!r.ok) return err(r.error);
		this.refreshQuests();
		return ok(undefined);
	}

	/** Turn in a completable quest, granting rewards and consuming items. */
	turnInQuest(id: string): Result<QuestDefinition, string> {
		const r = this.quests.turnIn(id);
		if (!r.ok) return err(r.error);
		const def = r.value;

		// Consume any items the objectives required.
		const consume = consumedItems(def);
		if (consume.length > 0) this.inventory.removeAll(consume);

		// Grant rewards.
		for (const item of def.rewards.items ?? []) {
			const itemDef = getItem(item.id);
			if (itemDef) this.inventory.add({ id: item.id, qty: item.qty }, itemDef);
		}
		for (const [skill, xp] of Object.entries(def.rewards.skillXp ?? {})) {
			this.skills.award(skill as never, xp);
		}
		if (def.rewards.relationshipNpc) {
			this.npcs.addRelationship(def.rewards.relationshipNpc, def.rewards.relationshipAmount ?? 1);
		}
		if (def.final) this.chapterComplete = true;

		this.statistics.questsCompleted += 1;
		this.refreshQuests();
		return ok(def);
	}

	/** Record that the player talked to an NPC (advances `talk` objectives). */
	talkToNpc(id: string, dialogueId: string): void {
		this.talkedNpcs.add(id);
		this.npcs.talk(id, dialogueId);
		this.refreshQuests();
	}

	/** Mark a biome as visited (advances `reach` objectives). */
	visitBiome(id: string): void {
		this.visitedBiomes.add(id);
		this.refreshQuests();
	}

	/** Active quests available for the HUD tracker. */
	activeQuests(): QuestProgress[] {
		return this.quests.activeQuests();
	}

	// ── Buildings ────────────────────────────────────────────────────────

	addBuilding(
		defId: string,
		position: Vec2,
		requires: ItemStack[]
	): Result<BuildingInstance, string> {
		const removed = this.inventory.removeAll(requires);
		if (!removed.ok) return err('insufficient materials');
		const instance: BuildingInstance = {
			id: `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
			definitionId: defId,
			position,
			rotation: 0,
			state: {}
		};
		this.buildings.push(instance);
		this.statistics.buildingsBuilt += 1;
		this.refreshQuests();
		return ok(instance);
	}

	/** Remove a placed building by id, returning its definition (for refunds). */
	removeBuilding(id: string): BuildingInstance | null {
		const idx = this.buildings.findIndex((b) => b.id === id);
		if (idx < 0) return null;
		const [removed] = this.buildings.splice(idx, 1);
		return removed;
	}

	/** Placed building whose footprint contains `position`, or null. */
	buildingAt(position: Vec2, tileSize: number): BuildingInstance | null {
		for (const b of this.buildings) {
			const def = getBuilding(b.definitionId);
			if (!def) continue;
			const halfW = (def.size.w * tileSize) / 2;
			const halfH = (def.size.h * tileSize) / 2;
			if (
				Math.abs(position.x - b.position.x) <= halfW &&
				Math.abs(position.y - b.position.y) <= halfH
			) {
				return b;
			}
		}
		return null;
	}

	// ── Death & recovery ─────────────────────────────────────────────────

	/** Kill the player and drop a recoverable backpack of non-critical items. */
	die(position: Vec2 = this.player.position): Backpack {
		this.player.isDead = true;
		this.statistics.deaths += 1;
		const slots = this.inventory.toArray();
		const { dropped, indices } = selectBackpackDrop(slots, this.inventory.hotbarSize, itemLookup);
		for (const i of indices) this.inventory.set(i, null);

		const backpack: Backpack = {
			id: `bp_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
			position: { ...position },
			contents: dropped
		};
		this.backpacks.push(backpack);
		return backpack;
	}

	/** Pick up a backpack by id, merging its contents (atomic). */
	recoverBackpack(id: string): Result<void, string> {
		const idx = this.backpacks.findIndex((b) => b.id === id);
		if (idx < 0) return err('backpack not found');
		const backpack = this.backpacks[idx];
		const merge = mergeBackpack(backpack, this.inventory, itemLookup);
		if (!merge.ok) return err('inventory_full');
		this.backpacks.splice(idx, 1);
		return ok(undefined);
	}

	/** Nearest recoverable backpack within `range` px, or null. */
	nearestBackpack(position: Vec2, range: number): Backpack | null {
		let best: Backpack | null = null;
		let bestD = range;
		for (const b of this.backpacks) {
			const d = Math.hypot(b.position.x - position.x, b.position.y - position.y);
			if (d < bestD) {
				bestD = d;
				best = b;
			}
		}
		return best;
	}

	respawn(): void {
		this.stats = respawnStats();
		this.player.isDead = false;
		// Prefer the placed respawn anchor (bed/shelter/house).
		const anchor = nearestRespawnAnchor(this.buildings as PlacedBuilding[]);
		if (anchor) this.player.position = anchor;
		this.syncPlayerFromStats();
	}

	// ── Determinism helper ───────────────────────────────────────────────

	/** Deterministic pseudo-random in [0,1) derived from the world seed + key. */
	seededRandom(key: string): number {
		let h = this.worldSeed >>> 0;
		for (let i = 0; i < key.length; i++) {
			h = (Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0) >>> 0;
		}
		h ^= h << 13;
		h >>>= 0;
		h ^= h >> 17;
		h ^= h << 5;
		h >>>= 0;
		return (h >>> 0) / 4294967296;
	}

	// ── Serialization ────────────────────────────────────────────────────

	toSave(): GameSave {
		this.updatedAt = Date.now();
		return {
			schemaVersion: CURRENT_SCHEMA_VERSION,
			gameVersion: this.gameVersion,
			saveId: this.saveId,
			worldSeed: this.worldSeed,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			player: { ...this.player, position: { ...this.player.position } },
			inventory: this.inventory.serialize(),
			equipment: this.equipment.serialize(this.hotbarSlots()),
			world: {
				seed: this.world.seed,
				chunkModifications: { ...this.world.chunkModifications },
				harvestedNodes: [...this.world.harvestedNodes],
				backpacks: this.backpacks.map((b) => ({
					...b,
					position: { ...b.position },
					contents: b.contents.map((c) => ({ ...c }))
				})),
				craftedCounts: { ...this.craftedCounts },
				defeatedCounts: { ...this.defeatedCounts },
				visitedBiomes: [...this.visitedBiomes],
				talkedNpcs: [...this.talkedNpcs]
			},
			buildings: this.buildings.map((b) => ({ ...b, position: { ...b.position } })),
			quests: this.quests.serialize(),
			npcs: this.npcs.serialize(),
			skills: this.skills.serialize(),
			statistics: { ...this.statistics },
			settings: {
				masterVolume: 1,
				musicVolume: 0.5,
				sfxVolume: 0.8,
				uiScale: 1,
				reducedMotion: false,
				screenShake: true,
				damageFlash: true
			},
			gameTimeMs: this.clock.totalMs,
			weather: this.weather,
			chapterComplete: this.chapterComplete
		};
	}

	static fromSave(save: GameSave): GameState {
		const state = new GameState(save.saveId, save.worldSeed, save.createdAt);
		state.createdAt = save.createdAt;
		state.updatedAt = save.updatedAt;
		state.gameVersion = save.gameVersion;
		state.clock = new GameClock(save.gameTimeMs);
		state.stats = {
			health: save.player.health,
			hunger: save.player.hunger,
			thirst: save.player.thirst,
			energy: save.player.energy
		};
		state.player = { ...save.player, position: { ...save.player.position } };
		state.inventory = Inventory.deserialize(save.inventory);
		state.equipment = new Equipment(state.inventory.hotbarSize, save.equipment);
		state.skills = new Skills();
		state.skills.deserialize(save.skills ?? []);
		state.world = {
			seed: save.world.seed,
			chunkModifications: { ...save.world.chunkModifications },
			harvestedNodes: [...save.world.harvestedNodes],
			backpacks: (save.world.backpacks ?? []).map((b) => ({
				...b,
				position: { ...b.position },
				contents: b.contents.map((c) => ({ ...c }))
			})),
			craftedCounts: { ...(save.world.craftedCounts ?? {}) },
			defeatedCounts: { ...(save.world.defeatedCounts ?? {}) },
			visitedBiomes: [...(save.world.visitedBiomes ?? [])],
			talkedNpcs: [...(save.world.talkedNpcs ?? [])]
		};
		state.backpacks = (save.world.backpacks ?? []).map((b) => ({
			...b,
			position: { ...b.position },
			contents: b.contents.map((c) => ({ ...c }))
		}));
		state.harvestedSet = new Set(save.world.harvestedNodes);
		state.craftedCounts = { ...(save.world.craftedCounts ?? {}) };
		state.defeatedCounts = { ...(save.world.defeatedCounts ?? {}) };
		state.visitedBiomes = new Set(save.world.visitedBiomes ?? []);
		state.talkedNpcs = new Set(save.world.talkedNpcs ?? []);
		state.quests = new QuestLog();
		state.quests.deserialize(save.quests ?? []);
		state.npcs = new NpcRegistry();
		state.npcs.deserialize(save.npcs ?? []);
		state.buildings = save.buildings.map((b) => ({ ...b, position: { ...b.position } }));
		state.statistics = {
			itemsGathered: save.statistics.itemsGathered ?? 0,
			itemsCrafted: save.statistics.itemsCrafted ?? 0,
			buildingsBuilt: save.statistics.buildingsBuilt ?? 0,
			enemiesDefeated: save.statistics.enemiesDefeated ?? 0,
			questsCompleted: save.statistics.questsCompleted ?? 0,
			deaths: save.statistics.deaths ?? 0,
			playTimeMs: save.statistics.playTimeMs ?? 0
		};
		state.weather = save.weather;
		state.chapterComplete = save.chapterComplete;
		return state;
	}

	// biome helper kept engine-agnostic
	setBiome(biome: BiomeId): void {
		this.player.biome = biome;
		if (!this.visitedBiomes.has(biome)) {
			this.visitedBiomes.add(biome);
			this.refreshQuests();
		}
	}
}
