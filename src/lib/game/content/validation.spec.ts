import { describe, it, expect } from 'vitest';
import { validateContent } from './validation';
import { ITEM_LIST } from '$data/items';
import { RECIPE_LIST } from '$data/recipes';
import { BUILDING_LIST } from '$data/buildings';
import { RESOURCE_NODE_LIST } from '$data/resources';
import { CREATURE_LIST } from '$data/creatures';
import { BIOME_LIST } from '$data/biomes';
import { QUEST_LIST } from '$data/quests';
import { NPC_LIST } from '$data/npcs';

describe('content validation', () => {
	it('reports no errors for the shipped content set', () => {
		const issues = validateContent();
		const errors = issues.filter((i) => i.severity === 'error');
		expect(
			errors,
			`content errors:\n${errors.map((e) => `  ${e.area}: ${e.message}`).join('\n')}`
		).toHaveLength(0);
	});

	it('every recipe ingredient and output resolves to an item', () => {
		const issues = validateContent().filter((i) => i.severity === 'error' && i.area === 'recipes');
		expect(issues).toHaveLength(0);
	});

	it('every building requirement resolves to an item', () => {
		const issues = validateContent().filter(
			(i) => i.severity === 'error' && i.area === 'buildings'
		);
		expect(issues).toHaveLength(0);
	});
});

describe('V1 content breadth', () => {
	it('ships the full production content set', () => {
		// Regression guard: the V1 catalogue must not shrink below the shipped set.
		expect(ITEM_LIST.length).toBeGreaterThanOrEqual(70);
		expect(RECIPE_LIST.length).toBeGreaterThanOrEqual(40);
		expect(BUILDING_LIST.length).toBeGreaterThanOrEqual(20);
		expect(RESOURCE_NODE_LIST.length).toBeGreaterThanOrEqual(18);
		expect(CREATURE_LIST.length).toBeGreaterThanOrEqual(9);
		expect(QUEST_LIST.length).toBeGreaterThanOrEqual(5);
		expect(NPC_LIST.length).toBeGreaterThanOrEqual(4);
	});

	it('every crafting material is obtainable (resource, loot, or recipe output)', () => {
		const producedByRecipe = new Set(RECIPE_LIST.flatMap((r) => r.outputs.map((o) => o.id)));
		const yieldedByNode = new Set(RESOURCE_NODE_LIST.flatMap((n) => n.yields.map((y) => y.itemId)));
		const droppedByCreature = new Set(CREATURE_LIST.flatMap((c) => c.loot.map((l) => l.itemId)));
		const obtainable = new Set<string>([
			...producedByRecipe,
			...yieldedByNode,
			...droppedByCreature
		]);
		const unobtainable = ITEM_LIST.filter((i) => !obtainable.has(i.id)).map((i) => i.id);
		// sailing_boat is only ever produced by its recipe (already covered); the
		// starting kit is granted by item id at new-game time.
		expect(unobtainable).toEqual([]);
	});

	it('every recipe output is reachable from a known station', () => {
		// Derive the stations actually used by recipes so new ones (e.g. the
		// Chapter II obsidian forge) must be provided by a building.
		const stations = new Set(RECIPE_LIST.map((r) => r.station));
		const provided = new Set(
			BUILDING_LIST.filter((b) => b.station).map((b) => b.station as string)
		);
		// 'hand' needs no building; every other station must be provided by a building.
		for (const station of stations) {
			if (station === 'hand') continue;
			expect(provided.has(station), `no building provides station "${station}"`).toBe(true);
		}
	});
});

describe('V1 content referential integrity', () => {
	const itemIds = new Set(ITEM_LIST.map((i) => i.id));
	const nodeIds = new Set(RESOURCE_NODE_LIST.map((n) => n.id));
	const creatureIds = new Set(CREATURE_LIST.map((c) => c.id));
	const questIds = new Set(QUEST_LIST.map((q) => q.id));
	const biomeIds = new Set<string>(BIOME_LIST.map((b) => b.id));

	it('every resource node yield resolves to an item with a valid range', () => {
		for (const node of RESOURCE_NODE_LIST) {
			expect(node.yields.length, `node ${node.id} yields nothing`).toBeGreaterThan(0);
			for (const y of node.yields) {
				expect(itemIds.has(y.itemId), `${node.id} yields unknown item "${y.itemId}"`).toBe(true);
				// A single yield type may be 0-at-worst (e.g. a bush that sometimes
				// gives no berries) but must be able to produce at least 1.
				expect(y.min, `${node.id}.${y.itemId} min`).toBeGreaterThanOrEqual(0);
				expect(y.max, `${node.id}.${y.itemId} max`).toBeGreaterThanOrEqual(Math.max(1, y.min));
			}
			// At least one yield must be guaranteed.
			expect(
				node.yields.some((y) => y.max >= 1),
				`node ${node.id} can never yield anything`
			).toBe(true);
		}
	});

	it('every resource node respawns with a positive schedule', () => {
		for (const node of RESOURCE_NODE_LIST) {
			if (node.respawn.mode === 'after_hours') {
				expect(node.respawn.hours, `${node.id} respawn hours`).toBeGreaterThan(0);
			}
		}
	});

	it('every biome is fully connected (node types + wildlife + weights)', () => {
		for (const biome of BIOME_LIST) {
			expect(biome.resourceTypes.length, `biome ${biome.id} has no resources`).toBeGreaterThan(0);
			for (const nodeId of biome.resourceTypes) {
				expect(nodeIds.has(nodeId), `biome ${biome.id} spawns unknown node "${nodeId}"`).toBe(true);
			}
			for (const speciesId of biome.wildlife) {
				expect(
					creatureIds.has(speciesId),
					`biome ${biome.id} spawns unknown creature "${speciesId}"`
				).toBe(true);
			}
			// Every weighted node must also be a listed resource type.
			for (const weighted of Object.keys(biome.resourceWeights)) {
				expect(
					biome.resourceTypes.includes(weighted),
					`biome ${biome.id} weights "${weighted}" but does not list it`
				).toBe(true);
			}
		}
	});

	it('every creature loot entry resolves to an item with a valid range', () => {
		for (const c of CREATURE_LIST) {
			for (const l of c.loot) {
				expect(itemIds.has(l.itemId), `creature ${c.id} loots unknown item "${l.itemId}"`).toBe(
					true
				);
				expect(l.min, `${c.id}.${l.itemId} min`).toBeGreaterThan(0);
				expect(l.max, `${c.id}.${l.itemId} max`).toBeGreaterThanOrEqual(l.min);
				expect(l.chance, `${c.id}.${l.itemId} chance`).toBeGreaterThanOrEqual(0);
				expect(l.chance, `${c.id}.${l.itemId} chance`).toBeLessThanOrEqual(1);
			}
		}
	});

	it('every building cost resolves to an item with a positive quantity', () => {
		for (const b of BUILDING_LIST) {
			for (const r of b.requires) {
				expect(itemIds.has(r.id), `building ${b.id} needs unknown item "${r.id}"`).toBe(true);
				expect(r.qty, `${b.id}.${r.id} qty`).toBeGreaterThan(0);
			}
			expect(b.size.w, `${b.id} width`).toBeGreaterThan(0);
			expect(b.size.h, `${b.id} height`).toBeGreaterThan(0);
		}
	});

	it('every recipe ingredient and output resolves to an item with a positive quantity', () => {
		for (const r of RECIPE_LIST) {
			expect(r.outputs.length, `recipe ${r.id} produces nothing`).toBeGreaterThan(0);
			for (const ing of r.ingredients) {
				expect(itemIds.has(ing.id), `recipe ${r.id} uses unknown item "${ing.id}"`).toBe(true);
				expect(ing.qty, `${r.id}.${ing.id} qty`).toBeGreaterThan(0);
			}
			for (const out of r.outputs) {
				expect(itemIds.has(out.id), `recipe ${r.id} outputs unknown item "${out.id}"`).toBe(true);
				expect(out.qty, `${r.id}->${out.id} qty`).toBeGreaterThan(0);
			}
		}
	});

	it('every quest objective references a valid target with a positive count', () => {
		for (const quest of QUEST_LIST) {
			expect(quest.objectives.length, `quest ${quest.id} has no objectives`).toBeGreaterThan(0);
			for (const obj of quest.objectives) {
				expect(obj.target, `${quest.id}/${obj.id} target`).toBeTruthy();
				expect(obj.count, `${quest.id}/${obj.id} count`).toBeGreaterThan(0);
			}
			for (const reward of quest.rewards?.items ?? []) {
				expect(
					itemIds.has(reward.id),
					`quest ${quest.id} rewards unknown item "${reward.id}"`
				).toBe(true);
				expect(reward.qty).toBeGreaterThan(0);
			}
		}
	});

	it('every quest prerequisite resolves to a known quest', () => {
		for (const quest of QUEST_LIST) {
			for (const pre of quest.prerequisites) {
				expect(questIds.has(pre), `${quest.id} requires unknown quest "${pre}"`).toBe(true);
				expect(pre, `${quest.id} must not require itself`).not.toBe(quest.id);
			}
		}
	});

	it('has exactly one finale per chapter', () => {
		const finals = QUEST_LIST.filter((q) => q.final);
		// Chapter I ends with the boat; Chapter II ends with the crater ward.
		expect(finals).toHaveLength(2);
		expect(finals.map((q) => q.id)).toEqual(['chapter1_boat', 'chapter2_ward']);
		// Each finale must actually have prerequisites (it is the tip of a chain).
		for (const f of finals) expect(f.prerequisites.length).toBeGreaterThan(0);
	});

	it('Chapter II forms a single chain that begins at the Chapter I finale', () => {
		const chapter2 = QUEST_LIST.filter((q) => (q.chapter ?? 1) === 2);
		expect(chapter2.length).toBeGreaterThanOrEqual(4);
		// Exactly one entry point, gated only on the Chapter I finale.
		const roots = chapter2.filter(
			(q) => q.prerequisites.length === 1 && q.prerequisites[0] === 'chapter1_boat'
		);
		expect(roots).toHaveLength(1);
		// Every other Chapter II quest depends on another Chapter II quest, so the
		// arc is a connected chain (no orphan side-quests shipped accidentally).
		for (const q of chapter2) {
			if (q.id === roots[0].id) continue;
			expect(
				q.prerequisites.some((p) => chapter2.some((c) => c.id === p)),
				`${q.id} is not connected to the Chapter II chain`
			).toBe(true);
		}
		// Chapter II objectives must reference targets that actually exist.
		for (const q of chapter2) {
			for (const obj of q.objectives) {
				if (obj.kind === 'gather' || obj.kind === 'craft')
					expect(itemIds.has(obj.target), `${q.id}/${obj.id} unknown item "${obj.target}"`).toBe(
						true
					);
				if (obj.kind === 'defeat' || obj.kind === 'reach')
					expect(
						creatureIds.has(obj.target) || biomeIds.has(obj.target),
						`${q.id}/${obj.id} unknown target "${obj.target}"`
					).toBe(true);
			}
		}
	});

	it('every NPC dialogue choice references a known quest', () => {
		for (const npc of NPC_LIST) {
			for (const node of Object.values(npc.dialogue)) {
				for (const choice of node.choices) {
					if (choice.questId) {
						expect(
							questIds.has(choice.questId),
							`npc ${npc.id} choice references unknown quest "${choice.questId}"`
						).toBe(true);
					}
					if (choice.requires) {
						expect(
							questIds.has(choice.requires.questId),
							`npc ${npc.id} requires unknown quest "${choice.requires.questId}"`
						).toBe(true);
					}
				}
			}
		}
	});

	it('every NPC has a reachable root dialogue', () => {
		for (const npc of NPC_LIST) {
			expect(
				npc.dialogue[npc.rootDialogue],
				`npc ${npc.id} root "${npc.rootDialogue}"`
			).toBeDefined();
		}
	});

	it('item ids are unique across the catalogue', () => {
		const seen = new Set<string>();
		for (const item of ITEM_LIST) {
			expect(seen.has(item.id), `duplicate item id "${item.id}"`).toBe(false);
			seen.add(item.id);
		}
	});

	it('recipe ids are unique across the catalogue', () => {
		const seen = new Set<string>();
		for (const r of RECIPE_LIST) {
			expect(seen.has(r.id), `duplicate recipe id "${r.id}"`).toBe(false);
			seen.add(r.id);
		}
	});
});
