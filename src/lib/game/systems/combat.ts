import { BALANCE } from '../config/balance';
import type { CreatureDefinition, LootEntry } from '$data/creatures';
import type { ItemStack, WeaponDefinition } from '$types/items';
import type { Vec2 } from '$types/core';

/**
 * Pure combat domain logic (see §20 / §34 / §35).
 *
 * No Phaser/Svelte imports: this module is fully unit-testable and deterministic
 * when supplied a seeded RNG. It covers:
 *  - attack resolution (range, cooldown, energy, criticals, durability)
 *  - damage application (armor reduction, knockback, invulnerability)
 *  - creature AI state machine (idle/patrol/chase/attack/flee/dead)
 *  - loot rolling from weighted drop tables
 */

// ── Attack resolution ───────────────────────────────────────────────────

export type AttackKind = 'light' | 'heavy';

export interface AttackRequest {
	kind: AttackKind;
	weapon: WeaponDefinition | null;
	/** Player skill levels (combat skill scales damage). */
	combatLevel: number;
}

export interface AttackResult {
	damage: number;
	isCritical: boolean;
	energyCost: number;
	cooldownMs: number;
	/** Durability consumed from the weapon (0 for unarmed). */
	durabilityCost: number;
	/** Range in px the attack reaches. */
	range: number;
}

/** Damage multiplier from the combat skill (each level = +6%). */
export function combatSkillMultiplier(level: number): number {
	return 1 + Math.max(0, level - 1) * 0.06;
}

/**
 * Resolve a player attack into concrete numbers, consuming no state. The
 * caller applies energy/durability/cooldown. Crit roll uses the supplied RNG.
 */
export function resolveAttack(req: AttackRequest, rng: () => number): AttackResult {
	const base = req.weapon ? req.weapon.damage : BALANCE.combat.baseUnarmedDamage;
	const heavy = req.kind === 'heavy';
	const skillMul = combatSkillMultiplier(req.combatLevel);

	let damage = base * skillMul * (heavy ? BALANCE.combat.heavyAttackMultiplier : 1);

	const critChance = req.weapon?.criticalChance ?? 0;
	const isCritical = rng() < critChance;
	if (isCritical) damage *= BALANCE.combat.criticalMultiplier;

	const cooldownMs = heavy
		? BALANCE.combat.heavyAttackCooldownMs
		: req.weapon
			? BALANCE.combat.baseAttackCooldownMs / Math.max(0.1, req.weapon.attackSpeed)
			: BALANCE.combat.baseAttackCooldownMs;

	const energyCost = heavy ? BALANCE.combat.heavyEnergyCost : (req.weapon?.energyCost ?? 0);

	return {
		damage: Math.max(1, Math.round(damage)),
		isCritical,
		energyCost,
		cooldownMs: Math.round(cooldownMs),
		durabilityCost: req.weapon ? req.weapon.durabilityCost : 0,
		range: req.weapon?.range ?? BALANCE.combat.unarmedRange
	};
}

// ── Creature state machine ──────────────────────────────────────────────

export type CreatureState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'dead';

export interface CreatureRuntime {
	definitionId: string;
	position: Vec2;
	/** Spawn anchor; AI leashes to this. */
	home: Vec2;
	health: number;
	maxHealth: number;
	state: CreatureState;
	/** Timestamp (ms) of the last attack, for cooldown. */
	lastAttackMs: number;
	/** Current wander target (idle/patrol). */
	wanderTarget: Vec2 | null;
}

export interface AiContext {
	playerPos: Vec2;
	/** Player is dead/away -> creatures disengage. */
	playerAlive: boolean;
	now: number;
}

/**
 * Advance a creature's AI by one tick. Pure: returns a NEW state object and a
 * movement delta the scene should apply. Deterministic given the seeded rng.
 */
export function stepCreatureAi(
	creature: CreatureRuntime,
	def: CreatureDefinition,
	ctx: AiContext,
	rng: () => number
): { creature: CreatureRuntime; move: Vec2; attack: boolean } {
	if (creature.state === 'dead') return { creature, move: { x: 0, y: 0 }, attack: false };

	const distToPlayer = Math.hypot(
		ctx.playerPos.x - creature.position.x,
		ctx.playerPos.y - creature.position.y
	);
	const distToHome = Math.hypot(
		creature.home.x - creature.position.x,
		creature.home.y - creature.position.y
	);

	const next: CreatureRuntime = { ...creature };
	let move: Vec2 = { x: 0, y: 0 };
	let attack = false;

	const hostile = def.behaviour === 'territorial' || def.behaviour === 'predator';
	const playerInAggro = ctx.playerAlive && distToPlayer <= def.aggroRadius;

	// Transition logic.
	switch (creature.state) {
		case 'idle':
		case 'patrol':
			if (distToHome > def.leash) {
				next.state = 'patrol';
				next.wanderTarget = creature.home;
			} else if (hostile && playerInAggro) {
				next.state = 'chase';
			} else if (
				def.behaviour === 'skittish' &&
				ctx.playerAlive &&
				distToPlayer <= def.aggroRadius * 0.8
			) {
				next.state = 'flee';
			} else if (!next.wanderTarget) {
				next.state = 'patrol';
				next.wanderTarget = wanderAround(creature.home, def.wanderRadius, rng);
			}
			break;
		case 'chase':
			if (!ctx.playerAlive || distToPlayer > def.leash) {
				next.state = 'patrol';
				next.wanderTarget = creature.home;
			} else if (distToPlayer <= def.attackRange) {
				next.state = 'attack';
			}
			break;
		case 'attack':
			if (!ctx.playerAlive || distToPlayer > def.attackRange * 1.4) {
				next.state = 'chase';
			}
			break;
		case 'flee':
			if (!ctx.playerAlive || distToPlayer > def.aggroRadius * 1.6) {
				next.state = 'patrol';
				next.wanderTarget = creature.home;
			}
			break;
	}

	// Movement for the resolved state.
	switch (next.state) {
		case 'chase':
			move = toward(creature.position, ctx.playerPos, def.speed);
			break;
		case 'flee':
			move = away(creature.position, ctx.playerPos, def.speed);
			break;
		case 'attack': {
			// Face the player but hold position; strike on cooldown.
			if (ctx.now - creature.lastAttackMs >= def.attackCooldownMs) {
				attack = true;
				next.lastAttackMs = ctx.now;
			}
			break;
		}
		case 'patrol': {
			const target = next.wanderTarget ?? creature.home;
			if (
				Math.hypot(target.x - creature.position.x, target.y - creature.position.y) < 6 ||
				distToHome > def.leash
			) {
				next.state = 'idle';
				next.wanderTarget = null;
			} else {
				move = toward(creature.position, target, def.speed * 0.5);
			}
			break;
		}
		case 'idle':
			// Occasionally pick a new wander target.
			if (rng() < 0.01) {
				next.state = 'patrol';
				next.wanderTarget = wanderAround(creature.home, def.wanderRadius, rng);
			}
			break;
	}

	return { creature: next, move, attack };
}

function toward(from: Vec2, to: Vec2, speed: number): Vec2 {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const len = Math.hypot(dx, dy);
	if (len < 0.0001) return { x: 0, y: 0 };
	// speed is px/second; the scene scales by delta. Returns a unit direction
	// scaled by speed for the scene to multiply by (delta/1000).
	return { x: (dx / len) * speed, y: (dy / len) * speed };
}

function away(from: Vec2, threat: Vec2, speed: number): Vec2 {
	const dx = from.x - threat.x;
	const dy = from.y - threat.y;
	const len = Math.hypot(dx, dy);
	if (len < 0.0001) return { x: speed, y: 0 };
	return { x: (dx / len) * speed, y: (dy / len) * speed };
}

function wanderAround(center: Vec2, radius: number, rng: () => number): Vec2 {
	const angle = rng() * Math.PI * 2;
	const r = rng() * radius;
	return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r };
}

// ── Damage application ──────────────────────────────────────────────────

export interface DamageResult {
	health: number;
	/** Knockback impulse vector to apply to the victim. */
	knockback: Vec2;
}

/**
 * Apply damage to the player, factoring armor reduction and knockback.
 * `armorReduction` is 0..1 (1 = full immunity).
 */
export function applyDamageToPlayer(
	currentHealth: number,
	damage: number,
	armorReduction: number,
	from: Vec2,
	to: Vec2,
	knockback: number
): DamageResult {
	const reduced = Math.max(0, damage * (1 - clamp01(armorReduction)));
	return {
		health: Math.max(0, currentHealth - reduced),
		knockback: direction(from, to, knockback)
	};
}

export function applyDamageToCreature(currentHealth: number, damage: number): number {
	return Math.max(0, currentHealth - Math.max(0, damage));
}

function direction(from: Vec2, to: Vec2, magnitude: number): Vec2 {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const len = Math.hypot(dx, dy);
	if (len < 0.0001) return { x: 0, y: 0 };
	return { x: (dx / len) * magnitude, y: (dy / len) * magnitude };
}

function clamp01(n: number): number {
	return Math.max(0, Math.min(1, n));
}

// ── Loot ────────────────────────────────────────────────────────────────

/** Roll a creature's loot table. Returns the item stacks dropped. */
export function rollLoot(table: LootEntry[], rng: () => number): ItemStack[] {
	const drops: ItemStack[] = [];
	for (const entry of table) {
		if (rng() > entry.chance) continue;
		const span = Math.max(0, entry.max - entry.min);
		const qty = entry.min + Math.round(rng() * span);
		if (qty > 0) drops.push({ id: entry.itemId, qty });
	}
	return drops;
}

/** True if the player can reach the target given the attack range. */
export function inAttackRange(from: Vec2, to: Vec2, range: number): boolean {
	return Math.hypot(to.x - from.x, to.y - from.y) <= range;
}
