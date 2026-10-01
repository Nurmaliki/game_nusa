/**
 * Quest definitions (data-driven, see §22 / §37).
 *
 * Quests form the main progression arc (Chapter I). Each quest declares:
 *  - objectives (typed counters the game tracks),
 *  - prerequisites (other quests that must be completed first),
 *  - rewards (items, skill xp, relationship).
 *
 * The quest engine (systems/quests.ts) is pure and evaluates objectives against
 * a snapshot of the world state.
 */

export type ObjectiveKind =
	| 'gather' // collect N of an item
	| 'craft' // craft N of an item
	| 'build' // place N of a building definition
	| 'defeat' // kill N creatures (optionally a specific species)
	| 'reach' // visit a biome
	| 'talk' // speak to an NPC
	| 'flag'; // a custom flag set by quest logic

export interface QuestObjectiveDefinition {
	id: string;
	description: string;
	kind: ObjectiveKind;
	/** Target id (item id, building id, creature id, biome id, npc id, flag). */
	target: string;
	/** Required count (1 for boolean objectives). */
	count: number;
	/** Consume the gathered items when the objective completes. */
	consume?: boolean;
}

export interface QuestReward {
	items?: { id: string; qty: number }[];
	/** Skill xp grants keyed by skill id. */
	skillXp?: Record<string, number>;
	/** Relationship gain with the quest giver. */
	relationshipNpc?: string;
	relationshipAmount?: number;
}

export interface QuestDefinition {
	id: string;
	name: string;
	description: string;
	/** NPC that gives the quest (for dialogue + rewards). */
	giver: string;
	/** Quests that must be COMPLETED before this becomes available. */
	prerequisites: string[];
	objectives: QuestObjectiveDefinition[];
	rewards: QuestReward;
	/** Completing this quest marks the chapter complete (final quest). */
	final?: boolean;
	/** Chapter number this quest belongs to (1-based). Defaults to 1. */
	chapter?: number;
}

export const QUESTS: Record<string, QuestDefinition> = {
	chapter1_start: {
		id: 'chapter1_start',
		name: 'Langkah Pertama',
		description: 'Pak Ujang memintamu menyiapkan bekal dasar untuk bertahan hidup.',
		giver: 'nelayan',
		prerequisites: [],
		objectives: [
			{
				id: 'gather_wood',
				description: 'Kumpulkan 10 kayu',
				kind: 'gather',
				target: 'wood',
				count: 10,
				consume: true
			},
			{
				id: 'gather_stone',
				description: 'Kumpulkan 5 batu',
				kind: 'gather',
				target: 'stone',
				count: 5,
				consume: true
			},
			{
				id: 'build_campfire',
				description: 'Bangun api unggun',
				kind: 'build',
				target: 'campfire',
				count: 1
			}
		],
		rewards: {
			items: [{ id: 'stone_axe', qty: 1 }],
			skillXp: { crafting: 40 },
			relationshipNpc: 'nelayan',
			relationshipAmount: 1
		}
	},

	chapter1_gather: {
		id: 'chapter1_gather',
		name: 'Menjaga Hutan',
		description: 'Ibu Sari memintamu mengumpulkan serat dan herba untuk ramuan pelindung.',
		giver: 'penjaga_hutan',
		prerequisites: ['chapter1_start'],
		objectives: [
			{
				id: 'gather_fiber',
				description: 'Kumpulkan 15 serat',
				kind: 'gather',
				target: 'fiber',
				count: 15,
				consume: true
			},
			{
				id: 'gather_herb',
				description: 'Kumpulkan 5 herba',
				kind: 'gather',
				target: 'herb',
				count: 5,
				consume: true
			},
			{
				id: 'talk_sari',
				description: 'Kembali kepada Ibu Sari',
				kind: 'talk',
				target: 'penjaga_hutan',
				count: 1
			}
		],
		rewards: {
			items: [{ id: 'herbal_tonic', qty: 2 }],
			skillXp: { survival: 50 },
			relationshipNpc: 'penjaga_hutan',
			relationshipAmount: 1
		}
	},

	chapter1_iron: {
		id: 'chapter1_iron',
		name: 'Besi Gunung',
		description: 'Ronggo mengajarkan cara melebur bijih besi menjadi batangan.',
		giver: 'penambang',
		prerequisites: ['chapter1_start'],
		objectives: [
			{
				id: 'gather_iron',
				description: 'Tambang 6 bijih besi',
				kind: 'gather',
				target: 'iron_ore',
				count: 6,
				consume: true
			},
			{
				id: 'craft_ingot',
				description: 'Tempa 3 batang besi',
				kind: 'craft',
				target: 'iron_ingot',
				count: 3,
				consume: true
			}
		],
		rewards: {
			items: [{ id: 'iron_pickaxe', qty: 1 }],
			skillXp: { crafting: 80 },
			relationshipNpc: 'penambang',
			relationshipAmount: 1
		}
	},

	chapter1_hunt: {
		id: 'chapter1_hunt',
		name: 'Penjaga Pulau',
		description: 'Bahaya mengintai. Buktikan kau mampu melindungi diri.',
		giver: 'penambang',
		prerequisites: ['chapter1_iron'],
		objectives: [
			{
				id: 'defeat_boar',
				description: 'Kalahkan 2 babi hutan',
				kind: 'defeat',
				target: 'boar',
				count: 2
			}
		],
		rewards: {
			items: [{ id: 'cooked_meat', qty: 3 }],
			skillXp: { combat: 100 },
			relationshipNpc: 'penambang',
			relationshipAmount: 1
		}
	},

	chapter1_boat: {
		id: 'chapter1_boat',
		name: 'Kapal Layar',
		description: 'Roh Leluhur membimbingmu menyelesaikan kapal untuk meninggalkan pulau.',
		giver: 'tokoh_lelluhur',
		prerequisites: ['chapter1_gather', 'chapter1_hunt'],
		objectives: [
			{
				id: 'fragments',
				description: 'Kumpulkan 3 pecahan kuno',
				kind: 'gather',
				target: 'ancient_fragment',
				count: 3,
				consume: false
			},
			{
				id: 'build_workshop',
				description: 'Bangun bengkel perahu',
				kind: 'build',
				target: 'boat_workshop',
				count: 1
			},
			{
				id: 'craft_boat',
				description: 'Bangun kapal layar',
				kind: 'craft',
				target: 'sailing_boat',
				count: 1,
				consume: false
			}
		],
		rewards: {
			skillXp: { crafting: 200 },
			relationshipNpc: 'tokoh_lelluhur',
			relationshipAmount: 2
		},
		final: true
	},

	// ── Chapter II: the volcanic crater ─────────────────────────────────
	chapter2_ashore: {
		id: 'chapter2_ashore',
		name: 'Mendarat di Kawah',
		description:
			'Perahu membawamu ke pulau kedua. Roh Leluhur memintamu menuju jantung pulau: kawah vulkanik.',
		giver: 'tokoh_lelluhur',
		chapter: 2,
		prerequisites: ['chapter1_boat'],
		objectives: [
			{
				id: 'reach_volcanic',
				description: 'Jelajahi Kawah Vulkanik',
				kind: 'reach',
				target: 'volcanic',
				count: 1
			}
		],
		rewards: {
			skillXp: { survival: 100 }
		}
	},
	chapter2_obsidian: {
		id: 'chapter2_obsidian',
		name: 'Kaca Vulkanik',
		description: 'Kumpulkan obsidian dan belerang dari kawah untuk menempa peralatan baru.',
		giver: 'tokoh_lelluhur',
		chapter: 2,
		prerequisites: ['chapter2_ashore'],
		objectives: [
			{
				id: 'gather_obsidian',
				description: 'Kumpulkan 6 pecahan obsidian',
				kind: 'gather',
				target: 'obsidian_shard',
				count: 6,
				consume: false
			},
			{
				id: 'gather_sulfur',
				description: 'Kumpulkan 4 belerang',
				kind: 'gather',
				target: 'sulfur',
				count: 4,
				consume: false
			}
		],
		rewards: {
			skillXp: { gathering: 150 },
			items: [{ id: 'herbal_tonic', qty: 3 }]
		}
	},
	chapter2_forge: {
		id: 'chapter2_forge',
		name: 'Perapian Obsidian',
		description: 'Bangun perapian obsidian dan tempa beliung vulkanik.',
		giver: 'tokoh_lelluhur',
		chapter: 2,
		prerequisites: ['chapter2_obsidian'],
		objectives: [
			{
				id: 'build_forge',
				description: 'Bangun perapian obsidian',
				kind: 'build',
				target: 'obsidian_forge',
				count: 1
			},
			{
				id: 'craft_pickaxe',
				description: 'Tempa beliung obsidian',
				kind: 'craft',
				target: 'obsidian_pickaxe',
				count: 1,
				consume: false
			}
		],
		rewards: {
			skillXp: { crafting: 200 }
		}
	},
	chapter2_beast: {
		id: 'chapter2_beast',
		name: 'Komodo Kawah',
		description: 'Naga darat menjaga permata di jantung kawah. Kalahkan penjaganya.',
		giver: 'tokoh_lelluhur',
		chapter: 2,
		prerequisites: ['chapter2_forge'],
		objectives: [
			{
				id: 'defeat_komodo',
				description: 'Kalahkan Komodo Kawah',
				kind: 'defeat',
				target: 'komodo',
				count: 1
			},
			{
				id: 'gather_gem',
				description: 'Dapatkan 1 permata kawah',
				kind: 'gather',
				target: 'gemstone',
				count: 1,
				consume: false
			}
		],
		rewards: {
			skillXp: { combat: 250 },
			relationshipNpc: 'tokoh_lelluhur',
			relationshipAmount: 2
		}
	},
	chapter2_ward: {
		id: 'chapter2_ward',
		name: 'Pusaka Kawah',
		description:
			'Tempa pusaka dari permata kawah untuk menenangkan roh gunung dan menuntaskan perjalananmu.',
		giver: 'tokoh_lelluhur',
		chapter: 2,
		prerequisites: ['chapter2_beast'],
		objectives: [
			{
				id: 'craft_ward',
				description: 'Tempa pusaka kawah',
				kind: 'craft',
				target: 'crater_ward',
				count: 1,
				consume: false
			}
		],
		rewards: {
			skillXp: { crafting: 400 },
			relationshipNpc: 'tokoh_lelluhur',
			relationshipAmount: 3
		},
		final: true
	}
};

export const QUEST_LIST: QuestDefinition[] = Object.values(QUESTS);

export function getQuest(id: string): QuestDefinition | undefined {
	return QUESTS[id];
}

/** The starting quest (no prerequisites). */
export function firstQuestId(): string {
	const q = QUEST_LIST.find((x) => x.prerequisites.length === 0);
	return q?.id ?? '';
}
