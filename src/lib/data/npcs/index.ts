import type { BiomeId } from '$types/core';

/**
 * NPC definitions (data-driven, see §21 / §36).
 *
 * NPCs have:
 *  - a home biome + anchor position (resolved deterministically from the seed),
 *  - a daily schedule (list of hourly waypoints),
 *  - a dialogue tree keyed by dialogue node id,
 *  - a relationship track advanced by quests.
 */

export interface ScheduleEntry {
	/** Start hour (0-23) this waypoint applies from. */
	fromHour: number;
	/** Position offset from the NPC anchor (px). */
	offset: { x: number; y: number };
	/** Optional activity label shown in dialogue. */
	activity?: string;
}

export interface DialogueChoice {
	text: string;
	/** Node to advance to, or null to end the conversation. */
	next: string | null;
	/** Optional quest id this choice accepts/advances. */
	questId?: string;
	/** Only show this choice when the quest is in this state. */
	requires?: { questId: string; state: string };
}

export interface DialogueNode {
	id: string;
	/** Lines spoken by the NPC (shown in order). */
	lines: string[];
	choices: DialogueChoice[];
}

export interface NpcDefinition {
	id: string;
	name: string;
	/** Short role subtitle (e.g. "Nelayan Tua"). */
	role: string;
	biome: BiomeId;
	texture: string;
	/** Deterministic anchor offset from the island centre (fraction -0.5..0.5). */
	anchor: { x: number; y: number };
	schedule: ScheduleEntry[];
	/** Entry dialogue node id. */
	rootDialogue: string;
	dialogue: Record<string, DialogueNode>;
	/** First met flag counts toward exploration stats. */
	relationshipFactor: number;
}

export const NPCS: Record<string, NpcDefinition> = {
	nelayan: {
		id: 'nelayan',
		name: 'Pak Ujang',
		role: 'Nelayan Tua',
		biome: 'tropical_coast',
		texture: 'placeholder_creature',
		anchor: { x: 0.42, y: 0.5 },
		schedule: [
			{ fromHour: 5, offset: { x: 0, y: 0 }, activity: 'memperbaiki jala' },
			{ fromHour: 9, offset: { x: -120, y: 40 }, activity: 'memancing' },
			{ fromHour: 18, offset: { x: 0, y: 0 }, activity: 'bersantai' }
		],
		rootDialogue: 'nelayan_root',
		relationshipFactor: 1,
		dialogue: {
			nelayan_root: {
				id: 'nelayan_root',
				lines: [
					'Selamat datang di pulau, anak muda.',
					'Dulu pulau ini damai. Sekarang kabut datang dari dataran tinggi.'
				],
				choices: [
					{
						text: 'Apa yang bisa kubantu?',
						next: 'nelayan_ask',
						questId: 'chapter1_start'
					},
					{ text: 'Aku akan kembali nanti.', next: null }
				]
			},
			nelayan_ask: {
				id: 'nelayan_ask',
				lines: [
					'Kumpulkan kayu dan batu dari pesisir. Kita perlu menyalakan api unggun.',
					'Setelah itu, bangun tempat berteduh di dekat pantai.'
				],
				choices: [{ text: 'Baiklah.', next: null, questId: 'chapter1_start' }]
			}
		}
	},

	penjaga_hutan: {
		id: 'penjaga_hutan',
		name: 'Ibu Sari',
		role: 'Penjaga Hutan',
		biome: 'rainforest',
		texture: 'placeholder_creature',
		anchor: { x: 0.5, y: 0.46 },
		schedule: [
			{ fromHour: 6, offset: { x: 0, y: 0 }, activity: 'merawat tanaman' },
			{ fromHour: 12, offset: { x: 90, y: -60 }, activity: 'memeriksa hutan' },
			{ fromHour: 20, offset: { x: 0, y: 0 }, activity: 'beristirahat' }
		],
		rootDialogue: 'sari_root',
		relationshipFactor: 1.2,
		dialogue: {
			sari_root: {
				id: 'sari_root',
				lines: [
					'Hutan ini hidup, dan ia mengingat.',
					'Jika kau membantu menjaga keseimbangannya, ia akan membantumu.'
				],
				choices: [
					{ text: 'Aku siap membantu.', next: null, questId: 'chapter1_gather' },
					{ text: 'Sampai jumpa.', next: null }
				]
			}
		}
	},

	penambang: {
		id: 'penambang',
		name: 'Ronggo',
		role: 'Penambang Dataran Tinggi',
		biome: 'highlands',
		texture: 'placeholder_creature',
		anchor: { x: 0.5, y: 0.54 },
		schedule: [
			{ fromHour: 6, offset: { x: 0, y: 0 }, activity: 'menambang' },
			{ fromHour: 14, offset: { x: -80, y: 80 }, activity: 'melebur besi' },
			{ fromHour: 22, offset: { x: 0, y: 0 }, activity: 'beristirahat' }
		],
		rootDialogue: 'ronggo_root',
		relationshipFactor: 1.4,
		dialogue: {
			ronggo_root: {
				id: 'ronggo_root',
				lines: [
					'Besi dari gunung ini kuat. Bukan sekadar batu biasa.',
					'Kalau kau bisa mendapatkannya, kau bisa membangun apa saja.'
				],
				choices: [
					{ text: 'Ajari aku.', next: null, questId: 'chapter1_iron' },
					{ text: 'Terima kasih.', next: null }
				]
			}
		}
	},

	tokoh_lelluhur: {
		id: 'tokoh_lelluhur',
		name: 'Roh Leluhur',
		role: 'Penjaga Warisan',
		biome: 'highlands',
		texture: 'placeholder_predator',
		anchor: { x: 0.5, y: 0.5 },
		schedule: [{ fromHour: 0, offset: { x: 0, y: 0 }, activity: 'bermeditasi' }],
		rootDialogue: 'leluhur_root',
		relationshipFactor: 2,
		dialogue: {
			leluhur_root: {
				id: 'leluhur_root',
				lines: [
					'Pecahan kuno berserakan di pulau ini.',
					'Kumpulkan tiga pecahannya, dan bangun kapal untuk membuka jalanmu.'
				],
				choices: [
					{ text: 'Aku akan menemukannya.', next: null, questId: 'chapter1_boat' },
					{ text: 'Untuk apa?', next: 'leluhur_why' }
				]
			},
			leluhur_why: {
				id: 'leluhur_why',
				lines: [
					'Bab pertama kisahmu berakhir ketika kau meninggalkan pulau ini dengan kapalmu sendiri.'
				],
				choices: [{ text: 'Aku mengerti.', next: null, questId: 'chapter1_boat' }]
			}
		}
	}
};

export const NPC_LIST: NpcDefinition[] = Object.values(NPCS);

export function getNpc(id: string): NpcDefinition | undefined {
	return NPCS[id];
}

/** Resolve the NPC's world position at a given in-game hour (pure). */
export function npcPositionAt(
	def: NpcDefinition,
	anchorPx: { x: number; y: number },
	hour: number
): { x: number; y: number; activity: string | null } {
	let active = def.schedule[0];
	for (const entry of def.schedule) {
		if (hour >= entry.fromHour) active = entry;
	}
	return {
		x: anchorPx.x + active.offset.x,
		y: anchorPx.y + active.offset.y,
		activity: active.activity ?? null
	};
}
