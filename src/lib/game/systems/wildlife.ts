import { getCreature, type CreatureDefinition } from '$data/creatures';
import { getBiome } from '$data/biomes';
import { BALANCE } from '../config/balance';
import type { BiomeId, Vec2 } from '$types/core';
import { stepCreatureAi, type CreatureRuntime } from './combat';

/**
 * Wildlife manager (see §19 / §34).
 *
 * Owns the live creature list, spawning/despawning around the player, and
 * stepping each creature's AI. Purely positional + deterministic given a
 * seeded RNG — the Phaser layer only renders the resulting creatures.
 */

export interface SpawnContext {
	playerPos: Vec2;
	biomeAt: (x: number, y: number) => BiomeId;
	/** World bounds in px, to keep spawns on-island. */
	worldWidth: number;
	worldHeight: number;
}

export class WildlifeManager {
	private creatures: CreatureRuntime[] = [];
	private rng: () => number;
	private lastSpawnMs = 0;
	private nextId = 1;
	/** Creature instance id (stable across frames) -> runtime. */
	private ids = new Map<string, number>();

	constructor(rng: () => number) {
		this.rng = rng;
	}

	all(): CreatureRuntime[] {
		return this.creatures;
	}

	count(): number {
		return this.creatures.length;
	}

	/** Remove all creatures (e.g. scene teardown). */
	clear(): void {
		this.creatures = [];
		this.ids.clear();
	}

	/**
	 * Spawn/despawn pass, called on an interval. Keeps the population bounded
	 * and biased toward the player's current biome.
	 */
	maybeSpawn(ctx: SpawnContext, now: number): void {
		if (now - this.lastSpawnMs < BALANCE.wildlife.spawnIntervalMs) return;
		this.lastSpawnMs = now;
		this.despawnFar(ctx.playerPos);
		if (this.creatures.length >= BALANCE.wildlife.maxActivePerChunk) return;
		if (this.rng() > BALANCE.wildlife.spawnChance) return;

		const pos = this.pickSpawnPosition(ctx);
		if (!pos) return;
		const biome = ctx.biomeAt(pos.x, pos.y);
		const def = this.pickSpecies(biome);
		if (!def) return;
		this.spawn(def, pos);
	}

	/** Spawn a specific creature at a position (used by tests + scenarios). */
	spawn(def: CreatureDefinition, position: Vec2): CreatureRuntime {
		const creature: CreatureRuntime = {
			definitionId: def.id,
			position: { ...position },
			home: { ...position },
			health: def.health,
			maxHealth: def.health,
			state: 'idle',
			lastAttackMs: 0,
			wanderTarget: null
		};
		this.creatures.push(creature);
		this.ids.set(`${def.id}_${this.nextId++}`, this.creatures.length - 1);
		return creature;
	}

	private pickSpawnPosition(ctx: SpawnContext): Vec2 | null {
		for (let attempt = 0; attempt < 8; attempt++) {
			const angle = this.rng() * Math.PI * 2;
			const r =
				BALANCE.wildlife.minSpawnDistance +
				this.rng() * (BALANCE.wildlife.spawnRadius - BALANCE.wildlife.minSpawnDistance);
			const x = ctx.playerPos.x + Math.cos(angle) * r;
			const y = ctx.playerPos.y + Math.sin(angle) * r;
			if (x < 0 || y < 0 || x > ctx.worldWidth || y > ctx.worldHeight) continue;
			return { x, y };
		}
		return null;
	}

	private pickSpecies(biome: BiomeId): CreatureDefinition | null {
		const biomeDef = getBiome(biome);
		if (!biomeDef || biomeDef.wildlife.length === 0) return null;
		const id = biomeDef.wildlife[Math.floor(this.rng() * biomeDef.wildlife.length)];
		return getCreature(id) ?? null;
	}

	private despawnFar(playerPos: Vec2): void {
		const maxDist = BALANCE.wildlife.despawnDistance;
		const maxSq = maxDist * maxDist;
		let write = 0;
		for (let read = 0; read < this.creatures.length; read++) {
			const c = this.creatures[read];
			const dx = c.position.x - playerPos.x;
			const dy = c.position.y - playerPos.y;
			if (dx * dx + dy * dy <= maxSq) {
				this.creatures[write++] = c;
			}
		}
		this.creatures.length = write;
	}

	/**
	 * Advance every creature's AI by `deltaMs`. Returns, for each creature that
	 * attacked this tick, the damage it dealt (so the scene can apply it).
	 */
	step(
		playerPos: Vec2,
		playerAlive: boolean,
		deltaMs: number,
		now: number
	): { creature: CreatureRuntime; damage: number; knockback: number }[] {
		const attacks: { creature: CreatureRuntime; damage: number; knockback: number }[] = [];
		for (let i = 0; i < this.creatures.length; i++) {
			const c = this.creatures[i];
			const def = getCreature(c.definitionId);
			if (!def) continue;
			const { creature, move, attack } = stepCreatureAi(
				c,
				def,
				{ playerPos, playerAlive, now },
				this.rng
			);
			// Integrate movement (speed already px/s). Mutate in place to avoid a
			// fresh position object per creature per frame.
			const dt = deltaMs / 1000;
			creature.position.x += move.x * dt;
			creature.position.y += move.y * dt;
			this.creatures[i] = creature;
			if (attack) {
				attacks.push({ creature, damage: def.damage, knockback: def.knockback });
			}
		}
		return attacks;
	}

	/** Apply damage to the creature nearest `point` within `range`. */
	damageNearest(point: Vec2, range: number, damage: number): CreatureRuntime | null {
		let best: CreatureRuntime | null = null;
		let bestD = range;
		for (const c of this.creatures) {
			if (c.state === 'dead') continue;
			const d = Math.hypot(c.position.x - point.x, c.position.y - point.y);
			if (d < bestD) {
				bestD = d;
				best = c;
			}
		}
		if (!best) return null;
		best.health = Math.max(0, best.health - damage);
		if (best.health <= 0) best.state = 'dead';
		return best;
	}

	/** Remove dead creatures; returns their definitions for loot handling. */
	reapDead(): CreatureRuntime[] {
		const dead: CreatureRuntime[] = [];
		let write = 0;
		for (let read = 0; read < this.creatures.length; read++) {
			const c = this.creatures[read];
			if (c.state === 'dead') dead.push(c);
			else this.creatures[write++] = c;
		}
		this.creatures.length = write;
		return dead;
	}

	/** Nearest live creature within range of a point, or null. */
	nearest(point: Vec2, range: number): CreatureRuntime | null {
		let best: CreatureRuntime | null = null;
		let bestD = range;
		for (const c of this.creatures) {
			if (c.state === 'dead') continue;
			const d = Math.hypot(c.position.x - point.x, c.position.y - point.y);
			if (d < bestD) {
				bestD = d;
				best = c;
			}
		}
		return best;
	}
}
