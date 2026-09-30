import type { ResourceNodeDefinition } from '$data/resources';
import type { ToolDefinition } from '$types/items';
import { BALANCE } from '../config/balance';

/**
 * Pure gathering calculation (see §13 / §60).
 * Decides how much "work" a swing applies and what a completed node yields.
 */

/** Effective gather power for a node given the equipped tool (or bare hands). */
export function gatherPower(node: ResourceNodeDefinition, tool: ToolDefinition | null): number {
	if (!tool) return 1; // bare hands are always possible, just slow
	const compatible =
		tool.resourceCompatibility.length === 0 || node.preferredTools.includes(tool.kind);
	if (node.preferredTools.length > 0 && !node.preferredTools.includes(tool.kind)) {
		// Wrong tool: reduced effectiveness but not blocked.
		return Math.max(1, tool.gatherPower * 0.5);
	}
	return compatible ? tool.gatherPower : 1;
}

/** Whether the given tool is the ideal match for a node. */
export function isPreferredTool(
	node: ResourceNodeDefinition,
	tool: ToolDefinition | null
): boolean {
	if (node.preferredTools.length === 0) return true;
	return tool !== null && node.preferredTools.includes(tool.kind);
}

export interface HarvestResult {
	/** Work remaining after this swing (0 = node completed). */
	workRemaining: number;
	completed: boolean;
	/** Durability consumed from the tool this swing (0 for bare hands). */
	durabilityCost: number;
}

export function applySwing(
	node: ResourceNodeDefinition,
	remainingWork: number,
	tool: ToolDefinition | null
): HarvestResult {
	const power = gatherPower(node, tool);
	const next = remainingWork - power;
	const completed = next <= 0;
	return {
		workRemaining: completed ? 0 : next,
		completed,
		durabilityCost: tool ? BALANCE.resource.toolDurabilityPerHit : 0
	};
}

export interface YieldRoll {
	itemId: string;
	qty: number;
}

/** Deterministic yield for a completed node (rng passed in for testability). */
export function rollYield(
	node: ResourceNodeDefinition,
	rng: () => number = Math.random
): YieldRoll[] {
	const out: YieldRoll[] = [];
	for (const y of node.yields) {
		const spread = y.max - y.min;
		const qty = spread <= 0 ? y.min : y.min + Math.floor(rng() * (spread + 1));
		if (qty > 0) out.push({ itemId: y.itemId, qty });
	}
	return out;
}

/** How long (in-game hours) until a node respawns, or null if never. */
export function respawnHours(node: ResourceNodeDefinition): number | null {
	return node.respawn.mode === 'after_hours' ? node.respawn.hours : null;
}
