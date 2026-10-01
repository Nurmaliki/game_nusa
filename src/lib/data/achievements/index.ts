/**
 * Achievement definitions (data-driven, see §22 end-game loop).
 *
 * Achievements are evaluated against a snapshot of the player's statistics,
 * skills and quest progress. They are intentionally declarative so new ones
 * need no code: add a definition here and the pure evaluator picks it up.
 */

export type AchievementConditionKind =
	| 'stat' // a lifetime statistic reaches a threshold
	| 'skill' // a skill reaches a level
	| 'quests' // N quests completed
	| 'chapters' // N chapters completed
	| 'allBiomes'; // every biome visited

export interface AchievementCondition {
	kind: AchievementConditionKind;
	/** For 'stat': the statistic key. For 'skill': the skill id. */
	target?: string;
	/** Required value (>= comparison). */
	count: number;
}

export interface AchievementDefinition {
	id: string;
	name: string;
	description: string;
	/** Hidden until unlocked (shown as "???" in the panel). */
	secret?: boolean;
	conditions: AchievementCondition[];
}

export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
	first_steps: {
		id: 'first_steps',
		name: 'Langkah Pertama',
		description: 'Kumpulkan 25 sumber daya.',
		conditions: [{ kind: 'stat', target: 'itemsGathered', count: 25 }]
	},
	forager: {
		id: 'forager',
		name: 'Peramu',
		description: 'Kumpulkan 500 sumber daya.',
		conditions: [{ kind: 'stat', target: 'itemsGathered', count: 500 }]
	},
	craftsman: {
		id: 'craftsman',
		name: 'Perajin',
		description: 'Buat 50 benda.',
		conditions: [{ kind: 'stat', target: 'itemsCrafted', count: 50 }]
	},
	artisan: {
		id: 'artisan',
		name: 'Maestro Kerajinan',
		description: 'Buat 250 benda.',
		conditions: [{ kind: 'stat', target: 'itemsCrafted', count: 250 }]
	},
	builder: {
		id: 'builder',
		name: 'Pembangun',
		description: 'Bangun 10 bangunan.',
		conditions: [{ kind: 'stat', target: 'buildingsBuilt', count: 10 }]
	},
	slayer: {
		id: 'slayer',
		name: 'Pemburu',
		description: 'Kalahkan 25 makhluk.',
		conditions: [{ kind: 'stat', target: 'enemiesDefeated', count: 25 }]
	},
	apex: {
		id: 'apex',
		name: 'Puncak Rantai Makanan',
		description: 'Kalahkan 100 makhluk.',
		conditions: [{ kind: 'stat', target: 'enemiesDefeated', count: 100 }]
	},
	survivor: {
		id: 'survivor',
		name: 'Penyintas',
		description: 'Bertahan hidup 30 menit.',
		conditions: [{ kind: 'stat', target: 'playTimeMs', count: 30 * 60_000 }]
	},
	journeyman: {
		id: 'journeyman',
		name: 'Pengembara',
		description: 'Bertahan hidup 2 jam.',
		conditions: [{ kind: 'stat', target: 'playTimeMs', count: 2 * 60 * 60_000 }]
	},
	questkeeper: {
		id: 'questkeeper',
		name: 'Penjaga Misi',
		description: 'Selesaikan 10 misi.',
		conditions: [{ kind: 'quests', count: 10 }]
	},
	skilled: {
		id: 'skilled',
		name: 'Terampil',
		description: 'Capai level 5 di salah satu keterampilan.',
		conditions: [{ kind: 'skill', target: 'gathering', count: 5 }]
	},
	master_gatherer: {
		id: 'master_gatherer',
		name: 'Master Pengumpul',
		description: 'Capai level 10 dalam mengumpulkan.',
		conditions: [{ kind: 'skill', target: 'gathering', count: 10 }]
	},
	master_crafter: {
		id: 'master_crafter',
		name: 'Master Perajin',
		description: 'Capai level 10 dalam kerajinan.',
		conditions: [{ kind: 'skill', target: 'crafting', count: 10 }]
	},
	angler: {
		id: 'angler',
		name: 'Pemancing Mula',
		description: 'Capai level 5 dalam memancing.',
		conditions: [{ kind: 'skill', target: 'fishing', count: 5 }]
	},
	explorer: {
		id: 'explorer',
		name: 'Penjelajah',
		description: 'Kunjungi setiap biome, termasuk kawah vulkanik.',
		conditions: [{ kind: 'allBiomes', count: 4 }]
	},
	crater_warden: {
		id: 'crater_warden',
		name: 'Penjaga Kawah',
		description: 'Tuntaskan kedua bab cerita.',
		conditions: [{ kind: 'chapters', count: 2 }]
	},
	untouchable: {
		id: 'untouchable',
		name: 'Tak Tersentuh',
		description: 'Rahasianya tersimpan di dalam gunung.',
		secret: true,
		conditions: [{ kind: 'stat', target: 'itemsCrafted', count: 1000 }]
	}
};

export const ACHIEVEMENT_LIST: AchievementDefinition[] = Object.values(ACHIEVEMENTS);

export function getAchievement(id: string): AchievementDefinition | undefined {
	return ACHIEVEMENTS[id];
}
