import type { ItemStack } from '$types/items';

/**
 * Building definitions (data-driven, see §18 / §31).
 *
 * Footprints are in tiles; `requires` are consumed on placement. Buildings that
 * provide a `station` unlock recipes while the player is within range.
 */
export interface BuildingDefinition {
	id: string;
	name: string;
	description: string;
	/** Texture key for the placed object and the placement preview. */
	texture: string;
	/** Footprint in tiles (width/height). */
	size: { w: number; h: number };
	requires: ItemStack[];
	/** Blocks player movement when placed. */
	solid: boolean;
	/** Must be placed near water (for docks/collectors). */
	nearWater?: boolean;
	/** Provides a crafting station of this id when nearby. */
	station?: string;
	/** Sets a respawn anchor (bed/shelter). */
	isRespawnAnchor?: boolean;
	/** Generic behaviour id handled by systems (e.g. 'storage', 'fire', 'farm'). */
	behaviour?: string;
	/** Unlock gate: only buildable once this is satisfied. */
	unlock?: { skill?: { id: string; level: number } };
}

export const BUILDINGS: Record<string, BuildingDefinition> = {
	campfire: {
		id: 'campfire',
		name: 'Api Unggun',
		description: 'Untuk memasak dan menghangatkan diri di malam hari.',
		texture: 'placeholder_bush',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'wood', qty: 5 },
			{ id: 'stone', qty: 3 }
		],
		solid: false,
		station: 'campfire',
		behaviour: 'fire'
	},
	shelter: {
		id: 'shelter',
		name: 'Teduh Sederhana',
		description: 'Tempat berlindung dan titik respawn sementara.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 2 },
		requires: [
			{ id: 'wood', qty: 8 },
			{ id: 'fiber', qty: 4 }
		],
		solid: true,
		isRespawnAnchor: true
	},
	bed: {
		id: 'bed',
		name: 'Tempat Tidur',
		description: 'Tidur untuk memulihkan energi dan melewati malam.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 1 },
		requires: [
			{ id: 'wood', qty: 6 },
			{ id: 'fiber', qty: 6 }
		],
		solid: false,
		isRespawnAnchor: true,
		behaviour: 'bed'
	},
	storage: {
		id: 'storage',
		name: 'Peti Penyimpanan',
		description: 'Menyimpan barang tambahan di dalamnya.',
		texture: 'placeholder_tile',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'wood', qty: 10 },
			{ id: 'fiber', qty: 2 }
		],
		solid: true,
		behaviour: 'storage'
	},
	workbench: {
		id: 'workbench',
		name: 'Meja Kerja',
		description: 'Membuka resep kerajinan tingkat lanjut.',
		texture: 'placeholder_tile',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'wood', qty: 10 },
			{ id: 'stone', qty: 4 }
		],
		solid: true,
		station: 'workbench'
	},
	cooking_station: {
		id: 'cooking_station',
		name: 'Dapur Lapangan',
		description: 'Memasak makanan kompleks menjadi lebih mengenyangkan.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 1 },
		requires: [
			{ id: 'wood', qty: 8 },
			{ id: 'stone', qty: 6 },
			{ id: 'clay', qty: 4 }
		],
		solid: true,
		station: 'cooking_station'
	},
	water_collector: {
		id: 'water_collector',
		name: 'Penampung Air',
		description: 'Menampung air hujan untuk diminum.',
		texture: 'placeholder_tile',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'wood', qty: 6 },
			{ id: 'clay', qty: 4 }
		],
		solid: true,
		behaviour: 'water'
	},
	farm_plot: {
		id: 'farm_plot',
		name: 'Petak Kebun',
		description: 'Menanam tanaman untuk panen berulang.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 2 },
		requires: [
			{ id: 'wood', qty: 4 },
			{ id: 'clay', qty: 6 },
			{ id: 'fiber', qty: 4 }
		],
		solid: false,
		behaviour: 'farm'
	},
	fence: {
		id: 'fence',
		name: 'Pagar',
		description: 'Membatasi area atau melindungi kebun.',
		texture: 'placeholder_tile',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'wood', qty: 2 },
			{ id: 'fiber', qty: 1 }
		],
		solid: true
	},
	torch: {
		id: 'torch',
		name: 'Obor',
		description: 'Menerangi area sekitar saat malam.',
		texture: 'placeholder_bush',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'wood', qty: 2 },
			{ id: 'fiber', qty: 1 }
		],
		solid: false,
		behaviour: 'light'
	},
	house: {
		id: 'house',
		name: 'Rumah',
		description: 'Tempat tinggal permanen dengan penyimpanan.',
		texture: 'placeholder_tile',
		size: { w: 3, h: 3 },
		requires: [
			{ id: 'wood', qty: 30 },
			{ id: 'fiber', qty: 12 },
			{ id: 'stone', qty: 10 }
		],
		solid: true,
		isRespawnAnchor: true,
		behaviour: 'storage',
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	fishing_dock: {
		id: 'fishing_dock',
		name: 'Dermaga Pancing',
		description: 'Memancing lebih efektif di tepi air.',
		texture: 'placeholder_tile',
		size: { w: 3, h: 1 },
		requires: [
			{ id: 'wood', qty: 14 },
			{ id: 'fiber', qty: 6 }
		],
		solid: false,
		nearWater: true,
		behaviour: 'fishing'
	},
	boat_workshop: {
		id: 'boat_workshop',
		name: 'Bengkel Perahu',
		description: 'Membangun kapal layar untuk mengakhiri Bab I.',
		texture: 'placeholder_tile',
		size: { w: 3, h: 3 },
		requires: [
			{ id: 'hardwood', qty: 24 },
			{ id: 'iron_ore', qty: 12 },
			{ id: 'fiber', qty: 16 }
		],
		solid: true,
		station: 'boat_workshop',
		unlock: { skill: { id: 'crafting', level: 5 } }
	},
	dock: {
		id: 'dock',
		name: 'Dermaga',
		description: 'Dermaga besar untuk kapal layar.',
		texture: 'placeholder_tile',
		size: { w: 4, h: 2 },
		requires: [
			{ id: 'hardwood', qty: 20 },
			{ id: 'stone', qty: 10 }
		],
		solid: false,
		nearWater: true,
		behaviour: 'dock'
	},
	drying_rack: {
		id: 'drying_rack',
		name: 'Rak Penjemur',
		description: 'Menjemur ikan dan kulit agar tahan lama.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 1 },
		requires: [
			{ id: 'wood', qty: 6 },
			{ id: 'rope', qty: 2 }
		],
		solid: false,
		behaviour: 'dry'
	},
	watchtower: {
		id: 'watchtower',
		name: 'Menara Pengawas',
		description: 'Menara tinggi untuk mengawasi sekitar.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 2 },
		requires: [
			{ id: 'hardwood', qty: 12 },
			{ id: 'stone', qty: 8 },
			{ id: 'rope', qty: 4 }
		],
		solid: true,
		behaviour: 'lookout',
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	garden_lamp: {
		id: 'garden_lamp',
		name: 'Lampu Taman',
		description: 'Lampu kaca yang menerangi halaman rumah.',
		texture: 'placeholder_bush',
		size: { w: 1, h: 1 },
		requires: [
			{ id: 'stone', qty: 2 },
			{ id: 'glass', qty: 1 },
			{ id: 'charcoal', qty: 1 }
		],
		solid: false,
		behaviour: 'light',
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	rain_catcher: {
		id: 'rain_catcher',
		name: 'Penadah Hujan',
		description: 'Penampung air hujan bervolume besar untuk musim kemarau.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 2 },
		requires: [
			{ id: 'bamboo', qty: 10 },
			{ id: 'clay', qty: 8 },
			{ id: 'rope', qty: 2 }
		],
		solid: true,
		behaviour: 'water',
		unlock: { skill: { id: 'survival', level: 2 } }
	},
	storage_chest: {
		id: 'storage_chest',
		name: 'Peti Besar',
		description: 'Peti penyimpanan berkapasitas besar dari kayu keras.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 1 },
		requires: [
			{ id: 'hardwood', qty: 12 },
			{ id: 'rope', qty: 4 }
		],
		solid: true,
		behaviour: 'storage',
		unlock: { skill: { id: 'crafting', level: 3 } }
	},
	well: {
		id: 'well',
		name: 'Sumur',
		description: 'Sumber air bersih permanen di tengah pemukiman.',
		texture: 'placeholder_tile',
		size: { w: 2, h: 2 },
		requires: [
			{ id: 'stone', qty: 16 },
			{ id: 'rope', qty: 4 },
			{ id: 'wood', qty: 8 }
		],
		solid: true,
		behaviour: 'water',
		unlock: { skill: { id: 'crafting', level: 4 } }
	}
};

export const BUILDING_LIST: BuildingDefinition[] = Object.values(BUILDINGS);

export function getBuilding(id: string): BuildingDefinition | undefined {
	return BUILDINGS[id];
}
