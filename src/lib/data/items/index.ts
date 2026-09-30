import type { ItemDefinition } from '$types/items';

/**
 * Item catalogue (data-driven, see §14 / §31).
 *
 * IDs are the ONLY stable identifiers — never use display names as keys.
 * Phase 2 introduces the resources and starter tools/consumables needed for the
 * vertical slice; later phases extend this table.
 */
export const ITEMS: Record<string, ItemDefinition> = {
	// ── Common resources ────────────────────────────────────────────────
	wood: {
		id: 'wood',
		name: 'Kayu',
		description: 'Kayu ringan dari pohon pesisir. Bahan dasar hampir semua bangunan.',
		category: 'resource',
		stackSize: 100,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_tree',
		sellValue: 1,
		tags: ['fuel', 'wood']
	},
	stone: {
		id: 'stone',
		name: 'Batu',
		description: 'Bongkahan batu keras untuk perkakas dan pondasi.',
		category: 'resource',
		stackSize: 100,
		weight: 2,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 1,
		tags: ['stone']
	},
	fiber: {
		id: 'fiber',
		name: 'Serat',
		description: 'Serat tanaman untuk tali dan anyaman.',
		category: 'resource',
		stackSize: 100,
		weight: 0.5,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 1,
		tags: ['fiber']
	},
	coconut: {
		id: 'coconut',
		name: 'Kelapa',
		description: 'Hidrasi alami dari pesisir tropis.',
		category: 'drink',
		stackSize: 20,
		weight: 1.5,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 2,
		tags: ['drink', 'food'],
		effects: { thirst: 20, hunger: 5 }
	},

	// ── Uncommon resources ──────────────────────────────────────────────
	hardwood: {
		id: 'hardwood',
		name: 'Kayu Keras',
		description: 'Kayu padat dari hutan hujan. Kuat dan tahan lembap.',
		category: 'resource',
		stackSize: 100,
		weight: 2,
		rarity: 'uncommon',
		icon: 'placeholder_tree',
		sellValue: 4,
		tags: ['wood', 'fuel']
	},
	clay: {
		id: 'clay',
		name: 'Tanah Liat',
		description: 'Lempung dari tepi sungai hutan.',
		category: 'resource',
		stackSize: 50,
		weight: 3,
		rarity: 'uncommon',
		icon: 'placeholder_rock',
		sellValue: 3,
		tags: ['clay']
	},
	herb: {
		id: 'herb',
		name: 'Herba',
		description: 'Tanaman obat dari lantai hutan.',
		category: 'material',
		stackSize: 50,
		weight: 0.5,
		rarity: 'uncommon',
		icon: 'placeholder_bush',
		sellValue: 3,
		tags: ['herb']
	},
	shell: {
		id: 'shell',
		name: 'Kerang',
		description: 'Cangkang keras dari pantai.',
		category: 'material',
		stackSize: 50,
		weight: 0.5,
		rarity: 'uncommon',
		icon: 'placeholder_rock',
		sellValue: 3,
		tags: ['shell']
	},

	// ── Rare resources ──────────────────────────────────────────────────
	iron_ore: {
		id: 'iron_ore',
		name: 'Biji Besi',
		description: 'Bijih besi dari dataran tinggi, bahan perkakas kuat.',
		category: 'resource',
		stackSize: 50,
		weight: 3,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 8,
		tags: ['iron', 'ore']
	},
	pearl: {
		id: 'pearl',
		name: 'Mutiara',
		description: 'Mutiara langka dari kerang pesisir.',
		category: 'material',
		stackSize: 20,
		weight: 0.2,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 15,
		tags: ['pearl', 'trade']
	},

	// ── Food ────────────────────────────────────────────────────────────
	meat: {
		id: 'meat',
		name: 'Daging Mentah',
		description: 'Daging hewan mentah. Lebih baik dimasak dulu.',
		category: 'food',
		stackSize: 20,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 3,
		tags: ['food', 'meat', 'raw'],
		effects: { hunger: 12, health: -4 }
	},
	cooked_meat: {
		id: 'cooked_meat',
		name: 'Daging Bakar',
		description: 'Daging matang yang mengenyangkan.',
		category: 'food',
		stackSize: 20,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 6,
		tags: ['food', 'meat', 'cooked'],
		effects: { hunger: 35, health: 8 }
	},

	// ── Creature drops ──────────────────────────────────────────────────
	hide: {
		id: 'hide',
		name: 'Kulit Hewan',
		description: 'Kulit mentah untuk kerajinan dan armor.',
		category: 'material',
		stackSize: 30,
		weight: 1.2,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 5,
		tags: ['hide', 'material']
	},
	feather: {
		id: 'feather',
		name: 'Bulu',
		description: 'Bulu ringan untuk anak panah dan hiasan.',
		category: 'material',
		stackSize: 50,
		weight: 0.2,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 2,
		tags: ['feather', 'material']
	},
	boar_tusk: {
		id: 'boar_tusk',
		name: 'Gading Babi',
		description: 'Gading tajam dari babi hutan.',
		category: 'material',
		stackSize: 10,
		weight: 0.6,
		rarity: 'uncommon',
		icon: 'placeholder_rock',
		sellValue: 8,
		tags: ['trophy', 'material']
	},
	venom_sac: {
		id: 'venom_sac',
		name: 'Kantung Bisa',
		description: 'Kantung bisa ular, berguna untuk racun.',
		category: 'material',
		stackSize: 10,
		weight: 0.3,
		rarity: 'uncommon',
		icon: 'placeholder_bush',
		sellValue: 10,
		tags: ['venom', 'material']
	},
	tiger_fang: {
		id: 'tiger_fang',
		name: 'Taring Harimau',
		description: 'Taring langka dari predator puncak pulau.',
		category: 'material',
		stackSize: 10,
		weight: 0.5,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 25,
		tags: ['trophy', 'material']
	},
	berry: {
		id: 'berry',
		name: 'Buah Beri',
		description: 'Buah kecil manis dari semak pesisir.',
		category: 'food',
		stackSize: 30,
		weight: 0.5,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 2,
		tags: ['food'],
		effects: { hunger: 12 }
	},
	cooked_berry: {
		id: 'cooked_berry',
		name: 'Beri Panggang',
		description: 'Beri yang dipanggang, lebih mengenyangkan.',
		category: 'food',
		stackSize: 30,
		weight: 0.5,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 3,
		tags: ['food'],
		effects: { hunger: 25 }
	},
	fish: {
		id: 'fish',
		name: 'Ikan',
		description: 'Ikan segar hasil memancing.',
		category: 'food',
		stackSize: 20,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_tile',
		sellValue: 4,
		tags: ['food'],
		effects: { hunger: 10 }
	},
	cooked_fish: {
		id: 'cooked_fish',
		name: 'Ikan Bakar',
		description: 'Ikan yang dibakar di api unggun.',
		category: 'food',
		stackSize: 20,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_tile',
		sellValue: 8,
		tags: ['food'],
		effects: { hunger: 32, health: 5 }
	},
	water_flask: {
		id: 'water_flask',
		name: 'Air Bersih',
		description: 'Air minum yang dikumpulkan di wadah.',
		category: 'drink',
		stackSize: 20,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_tile',
		sellValue: 2,
		tags: ['drink'],
		effects: { thirst: 35 }
	},

	// ── Tools ───────────────────────────────────────────────────────────
	stone_axe: {
		id: 'stone_axe',
		name: 'Kapak Batu',
		description: 'Kapak kasar untuk menebang pohon.',
		category: 'tool',
		stackSize: 1,
		weight: 2,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 5,
		tags: ['tool', 'axe'],
		tool: {
			kind: 'axe',
			gatherPower: 2,
			speed: 1.2,
			durability: 60,
			resourceCompatibility: ['wood', 'hardwood']
		}
	},
	stone_pickaxe: {
		id: 'stone_pickaxe',
		name: 'Beliung Batu',
		description: 'Untuk menambang batu dan bijih.',
		category: 'tool',
		stackSize: 1,
		weight: 2,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 5,
		tags: ['tool', 'pickaxe'],
		tool: {
			kind: 'pickaxe',
			gatherPower: 2,
			speed: 1.1,
			durability: 60,
			resourceCompatibility: ['stone', 'iron', 'clay']
		}
	},
	stone_knife: {
		id: 'stone_knife',
		name: 'Pisau Batu',
		description: 'Serbaguna untuk memanen serat dan hewan.',
		category: 'tool',
		stackSize: 1,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 4,
		tags: ['tool', 'knife'],
		tool: {
			kind: 'knife',
			gatherPower: 1.5,
			speed: 1.5,
			durability: 50,
			resourceCompatibility: ['fiber', 'herb']
		}
	},
	fishing_rod: {
		id: 'fishing_rod',
		name: 'Pancing',
		description: 'Untuk memancing di perairan pesisir.',
		category: 'tool',
		stackSize: 1,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_tree',
		sellValue: 6,
		tags: ['tool', 'fishing_rod'],
		tool: {
			kind: 'fishing_rod',
			gatherPower: 1,
			speed: 1,
			durability: 40,
			resourceCompatibility: ['fish']
		}
	},

	// ── Weapons (4 families: spear, bow, machete, sword) ────────────────
	wooden_spear: {
		id: 'wooden_spear',
		name: 'Tombak Kayu',
		description: 'Tombak sederhana untuk berburu pada jarak aman.',
		category: 'weapon',
		stackSize: 1,
		weight: 2,
		rarity: 'common',
		icon: 'placeholder_tree',
		sellValue: 6,
		tags: ['weapon', 'spear'],
		weapon: {
			family: 'spear',
			damage: 14,
			attackSpeed: 0.9,
			range: 64,
			energyCost: 6,
			criticalChance: 0.05,
			durabilityCost: 1,
			durability: 45
		}
	},
	short_bow: {
		id: 'short_bow',
		name: 'Busur Pendek',
		description: 'Senjata jarak jauh. Membutuhkan anak panah.',
		category: 'weapon',
		stackSize: 1,
		weight: 1.5,
		rarity: 'common',
		icon: 'placeholder_tree',
		sellValue: 8,
		tags: ['weapon', 'bow'],
		weapon: {
			family: 'bow',
			damage: 12,
			attackSpeed: 0.7,
			range: 260,
			energyCost: 8,
			criticalChance: 0.15,
			durabilityCost: 1,
			ranged: true,
			durability: 40
		}
	},
	machete: {
		id: 'machete',
		name: 'Parang',
		description: 'Bilah serbaguna untuk menebas dan bertarung.',
		category: 'weapon',
		stackSize: 1,
		weight: 2,
		rarity: 'uncommon',
		icon: 'placeholder_rock',
		sellValue: 12,
		tags: ['weapon', 'machete', 'blade'],
		weapon: {
			family: 'machete',
			damage: 16,
			attackSpeed: 1.3,
			range: 44,
			energyCost: 5,
			criticalChance: 0.1,
			durabilityCost: 1,
			durability: 55
		}
	},
	iron_sword: {
		id: 'iron_sword',
		name: 'Pedang Besi',
		description: 'Pedang kuat tempaan besi dataran tinggi.',
		category: 'weapon',
		stackSize: 1,
		weight: 3,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 30,
		tags: ['weapon', 'sword', 'blade'],
		weapon: {
			family: 'sword',
			damage: 22,
			attackSpeed: 1,
			range: 48,
			energyCost: 7,
			criticalChance: 0.12,
			durabilityCost: 1,
			durability: 90
		}
	},

	// ── Refined materials ───────────────────────────────────────────────
	iron_ingot: {
		id: 'iron_ingot',
		name: 'Batang Besi',
		description: 'Besi tempaan siap dipakai untuk perkakas dan senjata.',
		category: 'material',
		stackSize: 50,
		weight: 2,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 12,
		tags: ['iron', 'refined', 'material']
	},
	sail_cloth: {
		id: 'sail_cloth',
		name: 'Layar Kain',
		description: 'Kain anyaman untuk layar kapal.',
		category: 'material',
		stackSize: 20,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 10,
		tags: ['boat', 'material']
	},
	hull_plank: {
		id: 'hull_plank',
		name: 'Papan Lambung',
		description: 'Papan kuat untuk lambung kapal.',
		category: 'material',
		stackSize: 20,
		weight: 3,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 14,
		tags: ['boat', 'material']
	},

	// ── Tools (iron tier) ───────────────────────────────────────────────
	iron_axe: {
		id: 'iron_axe',
		name: 'Kapak Besi',
		description: 'Kapak tajam tahan lama.',
		category: 'tool',
		stackSize: 1,
		weight: 2.5,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 18,
		tags: ['tool', 'axe'],
		tool: {
			kind: 'axe',
			gatherPower: 3.5,
			speed: 1.3,
			durability: 140,
			resourceCompatibility: ['wood', 'hardwood']
		}
	},
	iron_pickaxe: {
		id: 'iron_pickaxe',
		name: 'Beliung Besi',
		description: 'Beliung kuat untuk menambang bijih.',
		category: 'tool',
		stackSize: 1,
		weight: 2.5,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 18,
		tags: ['tool', 'pickaxe'],
		tool: {
			kind: 'pickaxe',
			gatherPower: 3.5,
			speed: 1.2,
			durability: 140,
			resourceCompatibility: ['stone', 'iron', 'clay']
		}
	},

	// ── Consumables (cooking) ───────────────────────────────────────────
	fish_stew: {
		id: 'fish_stew',
		name: 'Sup Ikan',
		description: 'Hidangan hangat yang memulihkan banyak hal.',
		category: 'food',
		stackSize: 10,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 12,
		tags: ['food'],
		effects: { hunger: 45, thirst: 15, health: 10 }
	},
	herbal_tonic: {
		id: 'herbal_tonic',
		name: 'Ramuan Herba',
		description: 'Obat herbal yang memulihkan kesehatan.',
		category: 'consumable',
		stackSize: 10,
		weight: 0.5,
		rarity: 'uncommon',
		icon: 'placeholder_bush',
		sellValue: 10,
		tags: ['heal', 'consumable'],
		effects: { health: 30 }
	},

	// ── End-game ────────────────────────────────────────────────────────
	sailing_boat: {
		id: 'sailing_boat',
		name: 'Kapal Layar',
		description: 'Kapal untuk meninggalkan pulau. Tujuan Bab I.',
		category: 'quest',
		stackSize: 1,
		weight: 100,
		rarity: 'quest',
		icon: 'placeholder_tile',
		sellValue: 0,
		tags: ['boat', 'story'],
		questCritical: true,
		noDrop: true
	},

	// ── Quest / critical ────────────────────────────────────────────────
	ancient_fragment: {
		id: 'ancient_fragment',
		name: 'Pecahan Kuno',
		description: 'Serpihan berukir dari reruntuhan. Terasa penting.',
		category: 'quest',
		stackSize: 10,
		weight: 0.5,
		rarity: 'quest',
		icon: 'placeholder_rock',
		sellValue: 0,
		tags: ['quest'],
		questCritical: true,
		noDrop: true
	},

	// ── Refined materials (tier 2) ──────────────────────────────────────
	rope: {
		id: 'rope',
		name: 'Tali',
		description: 'Tali pintal dari serat. Bahan penting banyak bangunan.',
		category: 'material',
		stackSize: 50,
		weight: 0.5,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 5,
		tags: ['material', 'fiber']
	},
	cloth: {
		id: 'cloth',
		name: 'Kain',
		description: 'Kain tenun dari serat halus untuk pakaian dan layar.',
		category: 'material',
		stackSize: 50,
		weight: 0.5,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 8,
		tags: ['material', 'cloth']
	},
	charcoal: {
		id: 'charcoal',
		name: 'Arang',
		description: 'Bahan bakar panas untuk melebur logam.',
		category: 'material',
		stackSize: 100,
		weight: 0.5,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 3,
		tags: ['fuel', 'material']
	},
	steel_ingot: {
		id: 'steel_ingot',
		name: 'Batang Baja',
		description: 'Besi yang diperkaya arang menjadi jauh lebih kuat.',
		category: 'material',
		stackSize: 50,
		weight: 2,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 24,
		tags: ['steel', 'refined', 'material']
	},
	glass: {
		id: 'glass',
		name: 'Kaca',
		description: 'Kaca jernih dari pasir yang dilebur.',
		category: 'material',
		stackSize: 50,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 9,
		tags: ['material', 'glass']
	},
	leather: {
		id: 'leather',
		name: 'Kulit Samak',
		description: 'Kulit hewan yang disamak, lentur dan kuat.',
		category: 'material',
		stackSize: 50,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 7,
		tags: ['material', 'leather']
	},

	// ── Raw resources (tier 2) ──────────────────────────────────────────
	bamboo: {
		id: 'bamboo',
		name: 'Bambu',
		description: 'Batang bambu ringan untuk rangka dan pipa air.',
		category: 'resource',
		stackSize: 100,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_tree',
		sellValue: 2,
		tags: ['wood', 'bamboo']
	},
	salt: {
		id: 'salt',
		name: 'Garam',
		description: 'Garam laut untuk mengawetkan makanan.',
		category: 'resource',
		stackSize: 100,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 3,
		tags: ['material', 'salt']
	},
	sand: {
		id: 'sand',
		name: 'Pasir',
		description: 'Pasir pesisir, bahan dasar kaca.',
		category: 'resource',
		stackSize: 100,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_rock',
		sellValue: 2,
		tags: ['material', 'sand']
	},
	mushroom: {
		id: 'mushroom',
		name: 'Jamur Hutan',
		description: 'Jamur lembap hutan hujan, beracun mentah namun bergizi setelah dimasak.',
		category: 'food',
		stackSize: 20,
		weight: 0.5,
		rarity: 'uncommon',
		icon: 'placeholder_bush',
		sellValue: 4,
		tags: ['food', 'mushroom'],
		effects: { hunger: 6 }
	},
	gold_ore: {
		id: 'gold_ore',
		name: 'Bijih Emas',
		description: 'Logam mulia langka dari urat terdalam dataran tinggi.',
		category: 'resource',
		stackSize: 50,
		weight: 2,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 40,
		tags: ['gold', 'ore']
	},
	gold_ingot: {
		id: 'gold_ingot',
		name: 'Batang Emas',
		description: 'Emas tempaan, bahan ornamen dan perkakas terbaik.',
		category: 'material',
		stackSize: 50,
		weight: 2,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 60,
		tags: ['gold', 'refined', 'material']
	},
	croc_hide: {
		id: 'croc_hide',
		name: 'Kulit Buaya',
		description: 'Kulit tebal bersisik, sangat kuat untuk armor.',
		category: 'material',
		stackSize: 50,
		weight: 3,
		rarity: 'rare',
		icon: 'placeholder_tile',
		sellValue: 30,
		tags: ['material', 'hide', 'leather']
	},
	wolf_pelt: {
		id: 'wolf_pelt',
		name: 'Bulu Serigala',
		description: 'Bulu hangat dari predator dataran tinggi.',
		category: 'material',
		stackSize: 50,
		weight: 2,
		rarity: 'rare',
		icon: 'placeholder_tile',
		sellValue: 22,
		tags: ['material', 'hide', 'leather']
	},

	// ── Consumables (tier 2) ────────────────────────────────────────────
	mushroom_soup: {
		id: 'mushroom_soup',
		name: 'Sup Jamur',
		description: 'Sup hangat beraroma, mengenyangkan dan menyehatkan.',
		category: 'food',
		stackSize: 10,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 14,
		tags: ['food'],
		effects: { hunger: 40, thirst: 12 }
	},
	salted_fish: {
		id: 'salted_fish',
		name: 'Ikan Asin',
		description: 'Ikan yang diawetkan garam. Tahan lama, bisa dimakan dingin.',
		category: 'food',
		stackSize: 20,
		weight: 0.5,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 10,
		tags: ['food', 'preserved'],
		effects: { hunger: 32, thirst: -4 }
	},
	bandage: {
		id: 'bandage',
		name: 'Perban',
		description: 'Perban kain untuk menghentikan pendarahan ringan.',
		category: 'consumable',
		stackSize: 20,
		weight: 0.2,
		rarity: 'common',
		icon: 'placeholder_tile',
		sellValue: 6,
		tags: ['heal', 'consumable'],
		effects: { health: 18 }
	},
	antidote: {
		id: 'antidote',
		name: 'Penawar Racun',
		description: 'Ramuan penawar racun hewan berbisa.',
		category: 'consumable',
		stackSize: 10,
		weight: 0.3,
		rarity: 'rare',
		icon: 'placeholder_bush',
		sellValue: 18,
		tags: ['heal', 'consumable'],
		effects: { health: 25, energy: 10 }
	},

	// ── Weapons (tier 2) ────────────────────────────────────────────────
	iron_spear: {
		id: 'iron_spear',
		name: 'Tombak Besi',
		description: 'Tombak bermata besi dengan jangkauan panjang.',
		category: 'weapon',
		stackSize: 1,
		weight: 2.5,
		rarity: 'rare',
		icon: 'placeholder_rock',
		sellValue: 26,
		tags: ['weapon', 'spear'],
		weapon: {
			family: 'spear',
			damage: 24,
			attackSpeed: 1,
			range: 74,
			energyCost: 7,
			criticalChance: 0.1,
			durabilityCost: 1,
			durability: 100
		}
	},
	hunting_bow: {
		id: 'hunting_bow',
		name: 'Busur Berburu',
		description: 'Busur kuat dengan daya tembus jauh lebih besar.',
		category: 'weapon',
		stackSize: 1,
		weight: 2,
		rarity: 'rare',
		icon: 'placeholder_tree',
		sellValue: 34,
		tags: ['weapon', 'bow'],
		weapon: {
			family: 'bow',
			damage: 20,
			attackSpeed: 0.8,
			range: 300,
			energyCost: 9,
			criticalChance: 0.2,
			durabilityCost: 1,
			ranged: true,
			durability: 80
		}
	},
	steel_sword: {
		id: 'steel_sword',
		name: 'Pedang Baja',
		description: 'Baja tempa sempurna. Senjata terbaik di pulau.',
		category: 'weapon',
		stackSize: 1,
		weight: 3,
		rarity: 'special',
		icon: 'placeholder_rock',
		sellValue: 70,
		tags: ['weapon', 'sword', 'blade'],
		weapon: {
			family: 'sword',
			damage: 32,
			attackSpeed: 1.1,
			range: 52,
			energyCost: 8,
			criticalChance: 0.16,
			durabilityCost: 1,
			durability: 150
		}
	},

	// ── Tools (tier 2 extra) ────────────────────────────────────────────
	iron_knife: {
		id: 'iron_knife',
		name: 'Pisau Besi',
		description: 'Pisau cepat untuk memanen dan menguliti.',
		category: 'tool',
		stackSize: 1,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_rock',
		sellValue: 14,
		tags: ['tool', 'knife'],
		tool: {
			kind: 'knife',
			gatherPower: 3,
			speed: 1.7,
			durability: 120,
			resourceCompatibility: ['fiber', 'herb', 'mushroom']
		}
	},
	gold_hoe: {
		id: 'gold_hoe',
		name: 'Cangkul Emas',
		description: 'Cangkul ringan yang mempercepat pengolahan kebun.',
		category: 'tool',
		stackSize: 1,
		weight: 2,
		rarity: 'special',
		icon: 'placeholder_rock',
		sellValue: 80,
		tags: ['tool', 'hoe'],
		tool: {
			kind: 'hoe',
			gatherPower: 4,
			speed: 1.5,
			durability: 200,
			resourceCompatibility: ['clay', 'sand']
		}
	},

	// ── Armor ───────────────────────────────────────────────────────────
	fiber_tunic: {
		id: 'fiber_tunic',
		name: 'Baju Serat',
		description: 'Pakaian anyaman serat. Perlindungan ringan pertama.',
		category: 'armor',
		stackSize: 1,
		weight: 1.5,
		rarity: 'common',
		icon: 'placeholder_tile',
		sellValue: 8,
		tags: ['armor', 'light'],
		armor: { damageReduction: 0.08, durability: 60 }
	},
	leather_armor: {
		id: 'leather_armor',
		name: 'Baju Kulit',
		description: 'Kulit samak yang lentur, perlindungan seimbang.',
		category: 'armor',
		stackSize: 1,
		weight: 2.5,
		rarity: 'uncommon',
		icon: 'placeholder_tile',
		sellValue: 20,
		tags: ['armor', 'leather'],
		armor: { damageReduction: 0.18, durability: 120 }
	},
	iron_armor: {
		id: 'iron_armor',
		name: 'Zirah Besi',
		description: 'Zirah besi berat yang meredam banyak kerusakan.',
		category: 'armor',
		stackSize: 1,
		weight: 6,
		rarity: 'rare',
		icon: 'placeholder_tile',
		sellValue: 45,
		tags: ['armor', 'heavy'],
		armor: { damageReduction: 0.3, durability: 200 }
	},
	croc_armor: {
		id: 'croc_armor',
		name: 'Zirah Buaya',
		description: 'Sisik buaya yang keras, perlindungan terbaik di pulau.',
		category: 'armor',
		stackSize: 1,
		weight: 5,
		rarity: 'special',
		icon: 'placeholder_tile',
		sellValue: 90,
		tags: ['armor', 'heavy'],
		armor: { damageReduction: 0.42, durability: 280 }
	},

	// ── Ammunition & farming ────────────────────────────────────────────
	arrow: {
		id: 'arrow',
		name: 'Anak Panah',
		description: 'Anak panah untuk busur.',
		category: 'material',
		stackSize: 100,
		weight: 0.1,
		rarity: 'common',
		icon: 'placeholder_tree',
		sellValue: 1,
		tags: ['ammo', 'bow']
	},
	seed: {
		id: 'seed',
		name: 'Benih',
		description: 'Benih tanaman untuk ditanam di petak kebun.',
		category: 'material',
		stackSize: 100,
		weight: 0.1,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 2,
		tags: ['farm', 'seed']
	},
	fertilizer: {
		id: 'fertilizer',
		name: 'Pupuk',
		description: 'Pupuk organik untuk mempercepat pertumbuhan tanaman.',
		category: 'material',
		stackSize: 100,
		weight: 1,
		rarity: 'common',
		icon: 'placeholder_bush',
		sellValue: 3,
		tags: ['farm', 'material']
	},
	pearl_necklace: {
		id: 'pearl_necklace',
		name: 'Kalung Mutiara',
		description: 'Kalung mutiara indah. Bernilai tinggi bagi penduduk pulau.',
		category: 'material',
		stackSize: 10,
		weight: 0.3,
		rarity: 'special',
		icon: 'placeholder_tile',
		sellValue: 120,
		tags: ['treasure', 'luxury']
	},
	lantern: {
		id: 'lantern',
		name: 'Lentera',
		description: 'Lentera kaca genggam yang menerangi jalan saat malam.',
		category: 'tool',
		stackSize: 1,
		weight: 1,
		rarity: 'uncommon',
		icon: 'placeholder_bush',
		sellValue: 16,
		tags: ['tool', 'light']
	}
};

export function getItem(id: string): ItemDefinition | undefined {
	return ITEMS[id];
}

export function requireItem(id: string): ItemDefinition {
	const item = ITEMS[id];
	if (!item) throw new Error(`Unknown item id: ${id}`);
	return item;
}

/** All items as an array (for validation and menus). */
export const ITEM_LIST: ItemDefinition[] = Object.values(ITEMS);
