import type { RecipeDefinition } from '$data/recipes';
import { RECIPE_LIST } from '$data/recipes';
import type { ItemStack } from '$types/items';
import type { ItemLookup } from '../core/inventory';
import { Inventory } from '../core/inventory';
import { err, ok, type Result } from '$types/core';
import { BALANCE } from '../config/balance';

/**
 * Pure crafting domain logic (see §17 / §60).
 *
 * Crafting is ATOMIC: ingredients are validated and consumed only if the output
 * can be produced and the input is present. A failed craft never destroys
 * materials.
 */
export interface CraftContext {
	/** Crafting stations currently reachable by the player. */
	availableStations: Set<string>;
	/** Skill levels by skill id, for skill requirements. */
	skills?: Record<string, number>;
}

export type CraftError =
	| { reason: 'unknown_recipe' }
	| { reason: 'missing_station'; station: string }
	| { reason: 'missing_ingredients'; missing: ItemStack[] }
	| { reason: 'skill_too_low'; skill: string; level: number }
	| { reason: 'no_output_space' };

/** Which ingredients are missing for a recipe given an inventory. */
export function missingIngredients(inv: Inventory, recipe: RecipeDefinition): ItemStack[] {
	const missing: ItemStack[] = [];
	for (const ing of recipe.ingredients) {
		const have = inv.count(ing.id);
		if (have < ing.qty) {
			missing.push({ id: ing.id, qty: ing.qty - have });
		}
	}
	return missing;
}

export function canCraft(
	inv: Inventory,
	recipe: RecipeDefinition,
	ctx: CraftContext
): Result<void, CraftError> {
	if (recipe.station !== 'hand' && !ctx.availableStations.has(recipe.station)) {
		return err({ reason: 'missing_station', station: recipe.station });
	}
	if (recipe.skillRequirement) {
		const lvl = ctx.skills?.[recipe.skillRequirement.id] ?? 0;
		if (lvl < recipe.skillRequirement.level) {
			return err({
				reason: 'skill_too_low',
				skill: recipe.skillRequirement.id,
				level: recipe.skillRequirement.level
			});
		}
	}
	const missing = missingIngredients(inv, recipe);
	if (missing.length > 0) {
		return err({ reason: 'missing_ingredients', missing });
	}
	return ok(undefined);
}

/**
 * Perform a craft. Consumes ingredients atomically, then adds outputs. If the
 * outputs cannot fit, NOTHING changes (ingredients are restored by aborting
 * before consumption).
 *
 * Note: to guarantee atomicity we simulate on clones before committing.
 */
export function craft(
	inv: Inventory,
	recipeId: string,
	ctx: CraftContext,
	lookup: ItemLookup
): Result<ItemStack[], CraftError> {
	const recipe = RECIPE_LIST.find((r) => r.id === recipeId);
	if (!recipe) return err({ reason: 'unknown_recipe' });

	const can = canCraft(inv, recipe, ctx);
	if (!can.ok) return can;

	// Simulate on a clone: remove ingredients, add outputs. Commit only on success.
	const sim = Inventory.deserialize(inv.serialize());
	const removed = sim.removeAll(recipe.ingredients);
	if (!removed.ok) {
		// Shouldn't happen (canCraft passed) but keep it safe.
		return err({ reason: 'missing_ingredients', missing: recipe.ingredients });
	}
	const added = sim.addMany(recipe.outputs, lookup);
	if (!added.ok) {
		return err({ reason: 'no_output_space' });
	}

	// Commit: mirror the simulated result back into the live inventory.
	for (let i = 0; i < inv.capacity; i++) {
		inv.set(i, sim.get(i));
	}
	return ok(recipe.outputs.map((o) => ({ ...o })));
}

/** Recipes whose station requirement is satisfied by the given stations. */
export function availableRecipes(ctx: CraftContext, lookup: ItemLookup): RecipeDefinition[] {
	return RECIPE_LIST.filter((r) => {
		if (r.station !== 'hand' && !ctx.availableStations.has(r.station)) return false;
		if (r.unlock?.skill) {
			const lvl = ctx.skills?.[r.unlock.skill.id] ?? 0;
			if (lvl < r.unlock.skill.level) return false;
		}
		// Guard against recipes referencing unknown items (dev-time safety).
		return [...r.ingredients, ...r.outputs].every((s) => lookup(s.id) !== undefined);
	});
}

/** Default station range (px) from BALANCE. */
export const CRAFT_STATION_RANGE = BALANCE.crafting.stationRange;
