import Phaser from 'phaser';
import { ball, ellipse, mix, paint, poly, rect, scatter, shade, tuft } from './art';
import { SPRITE_KEYS, resourceTexture, creatureTexture } from './sprite-keys';

export { SPRITE_KEYS, resourceTexture, creatureTexture };

/**
 * Programmatic sprite painters (see §35).
 *
 * Every painter draws an ORIGINAL, recognizable sprite into a texture using
 * plain Phaser graphics ops — no external assets. The look is chunky pixel-art
 * built from layered primitives so placeholders read clearly as the thing they
 * represent (a palm, a boar, a gold vein…) until real art replaces them.
 *
 * Each painter is idempotent and keyed; the texture persists for the game's
 * lifetime. Centralising them here keeps `placeholders.ts` a thin registry.
 */

// ── Palette ────────────────────────────────────────────────────────────
// A warmer, slightly desaturated palette in the spirit of cozy farm-life
// games: sun-baked greens, honeyed sand, weathered stone and rich brown wood.
const GRASS = 0x5c9e57;
const GRASS_DARK = 0x417a3e;
const SAND = 0xe0c98f;
const SAND_DARK = 0xbfa066;
const ROCK = 0x93919f;
const ROCK_DARK = 0x63606f;
const WOOD = 0x8a5a34;
const WOOD_DARK = 0x5a3a1e;
const LEAF = 0x55a24a;
const LEAF_DARK = 0x367037;
const LEAF_LIGHT = 0x86cf6f;
const WATER = 0x3aa0c8;
const WATER_LIGHT = 0x74c6e4;

// ── Ground tiles (32×32) ───────────────────────────────────────────────

const TILE = 32;

function grassTile(g: Phaser.GameObjects.Graphics, base: number, accent: number): void {
	// Flat base with scattered blades — NO vertical gradient (a per-tile gradient
	// tiles into visible horizontal bands).
	rect(g, 0, 0, TILE, TILE, base);
	// Very subtle organic blotches, kept low-contrast so tiles don't read as
	// obviously repeated squares on the ground.
	ellipse(g, 8, 10, 6, 4, shade(base, 0.95), 0.28);
	ellipse(g, 24, 22, 7, 5, shade(base, 0.96), 0.24);
	ellipse(g, 18, 5, 5, 3, shade(base, 1.04), 0.22);
	// Fine pixel speckle for a hand-drawn meadow feel (deterministic, subtle).
	scatter(g, 0, 0, TILE, TILE, 16, shade(base, 0.93), 7, 0.35);
	scatter(g, 0, 0, TILE, TILE, 12, shade(base, 1.06), 13, 0.3);
	// Scattered blades of grass.
	const blades: [number, number][] = [
		[5, 8],
		[11, 20],
		[17, 6],
		[23, 15],
		[27, 25],
		[8, 27],
		[20, 29],
		[14, 13],
		[29, 4],
		[3, 17]
	];
	for (const [x, y] of blades) tuft(g, x, y, 4, accent);
	// A couple of tiny flowers add a cozy splash of colour.
	rect(g, 25, 9, 1, 3, shade(accent, 1.2));
	ball(g, 25, 8, 1, 0xf3e07a);
	rect(g, 6, 21, 1, 3, shade(accent, 1.2));
	ball(g, 6, 20, 1, 0xf0b6c8);
}

function sandTile(g: Phaser.GameObjects.Graphics, base: number, accent: number): void {
	rect(g, 0, 0, TILE, TILE, base);
	ellipse(g, 10, 12, 6, 4, shade(base, 0.94), 0.5);
	ellipse(g, 24, 20, 7, 5, shade(base, 1.05), 0.4);
	// Fine pebbly grain.
	scatter(g, 0, 0, TILE, TILE, 26, shade(base, 0.9), 5, 0.55);
	scatter(g, 0, 0, TILE, TILE, 16, shade(base, 1.08), 11, 0.5, 2);
	const specks: [number, number][] = [
		[4, 6],
		[13, 4],
		[22, 9],
		[7, 18],
		[18, 21],
		[27, 15],
		[11, 27],
		[24, 28]
	];
	for (const [x, y] of specks) rect(g, x, y, 2, 2, accent);
	// A couple of ripple lines.
	rect(g, 3, 12, 9, 1, shade(base, 0.86));
	rect(g, 20, 22, 8, 1, shade(base, 0.86));
	rect(g, 15, 8, 6, 1, shade(base, 1.1));
}

function rockTile(g: Phaser.GameObjects.Graphics): void {
	rect(g, 0, 0, TILE, TILE, ROCK_DARK);
	ellipse(g, 12, 12, 8, 6, shade(ROCK_DARK, 1.14), 0.6);
	ellipse(g, 24, 22, 8, 6, shade(ROCK_DARK, 0.9), 0.5);
	// Grain speckle for a rough stone surface.
	scatter(g, 0, 0, TILE, TILE, 24, shade(ROCK_DARK, 0.82), 3, 0.5);
	scatter(g, 0, 0, TILE, TILE, 16, shade(ROCK_DARK, 1.2), 9, 0.4);
	// Cracks + faceted chunks.
	g.lineStyle(1, shade(ROCK_DARK, 0.78), 1);
	g.strokeRect(2, 2, 12, 11);
	g.strokeRect(16, 4, 13, 10);
	g.strokeRect(6, 17, 20, 12);
	rect(g, 3, 3, 10, 3, shade(ROCK, 1.02));
	rect(g, 18, 6, 9, 2, shade(ROCK, 1.02));
	rect(g, 7, 18, 16, 2, shade(ROCK, 0.96));
}

// ── Trees ──────────────────────────────────────────────────────────────

function broadleafTree(g: Phaser.GameObjects.Graphics, leaf: number): void {
	// Trunk with bark texture.
	rect(g, 22, 30, 5, 16, WOOD);
	rect(g, 22, 30, 2, 16, shade(WOOD, 1.2));
	rect(g, 26, 30, 1, 16, WOOD_DARK);
	rect(g, 24, 33, 1, 3, WOOD_DARK);
	rect(g, 24, 40, 1, 3, WOOD_DARK);
	// Root flare.
	rect(g, 19, 44, 11, 3, WOOD_DARK);
	rect(g, 18, 45, 13, 2, shade(WOOD_DARK, 0.85));
	// Layered canopy: dark base, mid, light highlight — richer for depth.
	ball(g, 24, 22, 17, shade(leaf, 0.78));
	ball(g, 18, 26, 11, shade(leaf, 0.92));
	ball(g, 31, 26, 11, shade(leaf, 0.92));
	ball(g, 24, 15, 13, shade(leaf, 0.95));
	ball(g, 24, 12, 8, leaf);
	ball(g, 19, 14, 6, shade(leaf, 1.08));
	ball(g, 29, 16, 6, shade(leaf, 1.05));
	ball(g, 24, 10, 4, shade(leaf, 1.2));
	// Leafy dapple dabs.
	scatter(g, 12, 6, 26, 26, 14, shade(leaf, 1.25), 21, 0.5, 2);
	scatter(g, 12, 8, 26, 24, 12, shade(leaf, 0.72), 33, 0.4, 2);
	rect(g, 21, 8, 3, 3, shade(leaf, 1.32));
	// A little fruit/cluster for color.
	ball(g, 15, 18, 2, 0xd8534e);
	ball(g, 33, 21, 2, 0xd8534e);
	// shadow under canopy
	ellipse(g, 24, 34, 13, 3, 0x000000, 0.16);
}

function pineTree(g: Phaser.GameObjects.Graphics, leaf: number): void {
	// Trunk.
	rect(g, 22, 34, 5, 14, WOOD);
	rect(g, 22, 34, 2, 14, shade(WOOD, 1.18));
	// Stacked triangular tiers.
	const tiers = [
		{ y: 34, w: 22, h: 12 },
		{ y: 24, w: 18, h: 12 },
		{ y: 14, w: 13, h: 12 },
		{ y: 6, w: 8, h: 10 }
	];
	for (const t of tiers) {
		poly(
			g,
			[
				[24, t.y - t.h],
				[24 + t.w / 2, t.y],
				[24 - t.w / 2, t.y]
			],
			shade(leaf, 0.86)
		);
		poly(
			g,
			[
				[24, t.y - t.h + 1],
				[24 + t.w / 2 - 2, t.y - 1],
				[24 - t.w / 2 + 2, t.y - 1]
			],
			leaf
		);
	}
	rect(g, 23, 8, 2, 4, shade(leaf, 1.25));
	ellipse(g, 24, 46, 12, 3, 0x000000, 0.16);
}

function palmTree(g: Phaser.GameObjects.Graphics): void {
	// Curved trunk built from stacked blocks with ring texture.
	const trunk: [number, number][] = [
		[22, 44],
		[23, 40],
		[24, 36],
		[25, 32],
		[26, 28],
		[27, 24],
		[28, 20]
	];
	for (const [x, y] of trunk) {
		rect(g, x, y, 5, 5, WOOD);
		rect(g, x, y, 2, 5, shade(WOOD, 1.2));
		rect(g, x + 4, y, 1, 5, WOOD_DARK);
		// Ring notch across the trunk segment.
		rect(g, x, y + 4, 5, 1, shade(WOOD, 0.72));
	}
	// Fronds radiating from the crown (dark backing then the lit layer).
	const cx = 30;
	const cy = 18;
	const fronds: [number, number][][] = [
		[
			[cx, cy],
			[cx + 16, cy - 6],
			[cx + 20, cy + 2],
			[cx + 6, cy + 3]
		],
		[
			[cx, cy],
			[cx + 14, cy + 12],
			[cx + 8, cy + 16],
			[cx + 1, cy + 5]
		],
		[
			[cx, cy],
			[cx - 14, cy + 8],
			[cx - 16, cy + 14],
			[cx - 2, cy + 5]
		],
		[
			[cx, cy],
			[cx - 16, cy - 8],
			[cx - 12, cy - 14],
			[cx - 1, cy - 4]
		],
		[
			[cx, cy],
			[cx + 2, cy - 16],
			[cx + 8, cy - 16],
			[cx + 3, cy - 2]
		]
	];
	for (const f of fronds) {
		poly(g, f as [number, number][], LEAF_DARK);
	}
	for (const f of fronds) {
		// Inset the lit layer by 1px for a rimmed leaf.
		const mid: [number, number][] = f.map(([x, y], i) =>
			i === 0 ? ([x, y] as [number, number]) : ([x - Math.sign(x - cx), y] as [number, number])
		);
		poly(g, mid, LEAF);
	}
	// A light catch on the top frond.
	poly(
		g,
		[
			[cx, cy - 1],
			[cx + 5, cy - 12],
			[cx + 8, cy - 12],
			[cx + 3, cy - 1]
		],
		shade(LEAF, 1.2)
	);
	// Coconuts clustered at the crown.
	ball(g, 28, 21, 3, 0x5a3b22);
	ball(g, 33, 22, 3, 0x6b4a2f);
	ball(g, 30, 24, 3, 0x4a3220);
	ball(g, 28, 22, 1, 0x7d5a3a);
	ellipse(g, 26, 46, 13, 3, 0x000000, 0.16);
}

function bambooGrove(g: Phaser.GameObjects.Graphics): void {
	const stalks: [number, number][] = [
		[14, 20],
		[22, 14],
		[30, 22],
		[18, 30]
	];
	for (const [x, top] of stalks) {
		rect(g, x, top, 4, 44 - top, 0x8fb84a);
		rect(g, x, top, 1, 44 - top, 0xc0dd78);
		// Nodes.
		for (let y = top + 6; y < 44; y += 10) rect(g, x, y, 4, 1, 0x5c7d28);
	}
	// Leaves.
	const leaves: [number, number][][] = [
		[
			[16, 20],
			[6, 14],
			[10, 22]
		],
		[
			[24, 14],
			[34, 8],
			[30, 18]
		],
		[
			[32, 22],
			[42, 18],
			[36, 26]
		]
	];
	for (const l of leaves) poly(g, l as [number, number][], LEAF);
	ellipse(g, 24, 46, 14, 3, 0x000000, 0.16);
}

// ── Bushes & ground plants ─────────────────────────────────────────────

function bush(g: Phaser.GameObjects.Graphics, withBerries: boolean): void {
	// Dark under-layer for weight.
	ball(g, 14, 19, 9, shade(LEAF_DARK, 0.85));
	ball(g, 26, 19, 9, shade(LEAF_DARK, 0.85));
	ball(g, 20, 16, 10, LEAF_DARK);
	ball(g, 20, 13, 8, LEAF);
	ball(g, 16, 14, 5, shade(LEAF, 1.1));
	ball(g, 25, 15, 5, shade(LEAF, 1.05));
	ball(g, 20, 11, 4, LEAF_LIGHT);
	// Leafy speckle.
	scatter(g, 10, 8, 20, 16, 10, shade(LEAF, 0.7), 17, 0.45, 2);
	if (withBerries) {
		for (const [x, y] of [
			[13, 16],
			[24, 15],
			[19, 22],
			[28, 20],
			[17, 12],
			[26, 11]
		] as [number, number][]) {
			ball(g, x, y, 2, 0xcf4a58);
			ball(g, x - 1, y - 1, 1, 0xf07a86);
		}
	}
	ellipse(g, 20, 28, 12, 3, 0x000000, 0.16);
}

function herbPatch(g: Phaser.GameObjects.Graphics): void {
	const stems: [number, number][] = [
		[12, 26],
		[18, 22],
		[24, 26],
		[15, 30],
		[27, 30]
	];
	for (const [x, y] of stems) {
		rect(g, x, y, 1, 12, 0x4a7d3a);
		ball(g, x, y, 3, 0x8fd15a);
		ball(g, x, y - 1, 1, 0xc8f08a);
	}
}

function mushroomPatch(g: Phaser.GameObjects.Graphics): void {
	const caps: [number, number, number][] = [
		[14, 22, 6],
		[24, 26, 5],
		[20, 18, 4]
	];
	for (const [x, y, r] of caps) {
		rect(g, x - 1, y, 2, 8, 0xe8d9c0);
		ellipse(g, x, y, r, r * 0.7, 0xc0392b);
		ball(g, x - r * 0.3, y - r * 0.3, 1, 0xf5e6d3);
		ball(g, x + r * 0.4, y, 1, 0xf5e6d3);
	}
}

function rarePlant(g: Phaser.GameObjects.Graphics): void {
	rect(g, 19, 24, 2, 12, 0x3a6b3a);
	const petals = [
		[20, 14],
		[14, 20],
		[26, 20],
		[20, 26]
	];
	for (const [x, y] of petals) ball(g, x, y, 4, 0x9b59d0);
	ball(g, 20, 20, 4, 0xf1c40f);
	ball(g, 20, 20, 2, 0xfff3b0);
	// Glow dots.
	for (const [x, y] of [
		[10, 12],
		[30, 24],
		[12, 28]
	])
		ball(g, x, y, 1, 0xe8d3ff);
}

// ── Rocks & ore ────────────────────────────────────────────────────────

/** A low mound of clay: rounded, earthy, with a dug-out top. */
function clayMound(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 30, 17, 7, 0x000000, 0.14);
	ellipse(g, 22, 24, 16, 10, 0x9a5b3b);
	ellipse(g, 22, 21, 15, 9, 0xb5734b);
	// Pit / dug top showing fresh clay.
	ellipse(g, 22, 19, 7, 4, 0x7d4229);
	ellipse(g, 22, 18, 5, 3, 0x93502f);
	// Texture clods.
	ball(g, 12, 26, 2, 0x8a4c30);
	ball(g, 31, 25, 2, 0x8a4c30);
	ball(g, 27, 14, 2, 0xc98a5c);
	rect(g, 8, 29, 4, 2, 0x7d4229);
}

/** A flat salt pan: near-white cracked crust with faint brine pools. */
function saltFlat(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 28, 18, 7, 0x000000, 0.1);
	ellipse(g, 22, 22, 18, 12, 0xe6ebef);
	ellipse(g, 22, 20, 16, 10, 0xf4f7f9);
	// Crack lines across the crust.
	g.lineStyle(1, 0xc2ccd4, 1);
	g.lineBetween(6, 22, 16, 18);
	g.lineBetween(16, 18, 22, 24);
	g.lineBetween(22, 24, 34, 20);
	g.lineBetween(12, 14, 20, 22);
	g.lineBetween(30, 14, 24, 22);
	// Brine pools.
	ellipse(g, 14, 26, 3, 2, 0xbcd0dc);
	ellipse(g, 29, 26, 3, 2, 0xbcd0dc);
}

/** A bank of pale sand: a low dune with ripples. */
function sandBank(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 30, 18, 6, 0x000000, 0.12);
	poly(
		g,
		[
			[6, 30],
			[12, 16],
			[22, 12],
			[33, 17],
			[38, 30]
		],
		0xd8c48a
	);
	poly(
		g,
		[
			[12, 16],
			[22, 12],
			[30, 17],
			[22, 22]
		],
		0xeadcae
	);
	// Wind ripples.
	g.lineStyle(1, 0xb8a06a, 1);
	g.lineBetween(10, 26, 34, 24);
	g.lineBetween(12, 22, 32, 21);
	rect(g, 14, 28, 18, 1, 0xc7b178);
}

/** A mossy ruin cache: broken stone block with a recessed chest niche. */
function ruinCache(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 33, 16, 5, 0x000000, 0.16);
	// Broken plinth blocks.
	rect(g, 8, 20, 28, 12, 0x8a93a6);
	rect(g, 8, 20, 28, 3, 0xa3abbc);
	rect(g, 8, 29, 28, 3, 0x6b7385);
	g.lineStyle(1, 0x5a6375, 1);
	g.strokeRect(14, 23, 16, 8);
	// Crumbled corner gap.
	rect(g, 30, 20, 6, 6, 0x6b7385);
	// Recessed niche with a small chest.
	rect(g, 15, 24, 14, 7, 0x3a2f22);
	rect(g, 16, 25, 12, 5, 0x8a5a2b);
	rect(g, 16, 27, 12, 1, 0x5f3d1c);
	rect(g, 21, 26, 2, 3, 0xf1c40f);
	// Moss patches.
	ball(g, 10, 20, 3, 0x4a7d3a);
	ball(g, 33, 22, 2, 0x4a7d3a);
}

/** A bed of oysters: clustered grey shells among wet sand. */
function oysterBed(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 30, 16, 6, 0x000000, 0.12);
	ellipse(g, 22, 24, 16, 10, 0xb8a06a);
	ellipse(g, 22, 23, 14, 8, 0xcdb88a);
	const shells: [number, number, number][] = [
		[14, 24, 6],
		[27, 22, 7],
		[20, 28, 6],
		[30, 28, 5]
	];
	for (const [x, y, r] of shells) {
		ellipse(g, x, y, r, r * 0.72, 0x9aa2ae);
		ellipse(g, x, y - 1, r - 2, r * 0.5, 0xc3cad3);
		g.lineStyle(1, 0x7d848f, 1);
		g.lineBetween(x - r + 2, y, x + r - 2, y);
	}
	// A pearly highlight.
	ball(g, 16, 22, 1, 0xf2f4f7);
	ball(g, 28, 20, 1, 0xf2f4f7);
}

/** Volcanic obsidian: a dark glassy boulder with sharp facets. */
function obsidianRock(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 34, 18, 5, 0x000000, 0.2);
	poly(
		g,
		[
			[7, 32],
			[12, 12],
			[24, 8],
			[36, 20],
			[32, 34]
		],
		0x241f2b
	);
	// Glassy facet highlights.
	poly(
		g,
		[
			[12, 12],
			[24, 8],
			[22, 22]
		],
		0x3a3348
	);
	poly(
		g,
		[
			[24, 8],
			[36, 20],
			[24, 24]
		],
		0x453f57
	);
	g.lineStyle(1, 0x5b5470, 1);
	g.lineBetween(22, 22, 32, 34);
	g.lineBetween(22, 22, 11, 30);
	ball(g, 16, 16, 1, 0x8a86a8);
}

/** A sulfur vent: a cracked mound crusted with yellow deposits and fumes. */
function sulfurVent(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 30, 17, 6, 0x000000, 0.18);
	ellipse(g, 22, 24, 16, 11, 0x4a4038);
	ellipse(g, 22, 22, 12, 8, 0x2f2a24);
	// Vent mouth.
	ellipse(g, 22, 22, 6, 4, 0x141210);
	// Sulfur crust around the rim.
	for (const [x, y, r] of [
		[14, 20, 3],
		[30, 21, 3],
		[20, 27, 3],
		[26, 26, 2],
		[22, 16, 2]
	] as [number, number, number][]) {
		ball(g, x, y, r, 0xd9cf3a);
		ball(g, x - 1, y - 1, Math.max(1, r - 1), 0xf3ec7a);
	}
	// Faint fumes.
	ellipse(g, 22, 12, 4, 3, 0xb9c2c4, 0.35);
	ellipse(g, 25, 8, 2, 2, 0xb9c2c4, 0.25);
}

/** A gem vein: a dark rock banded with glowing crystals. */
function gemVein(g: Phaser.GameObjects.Graphics): void {
	boulder(g, 0x3a3348);
	const gems: [number, number, number][] = [
		[16, 20, 3],
		[25, 24, 3],
		[20, 15, 2],
		[28, 17, 2]
	];
	for (const [x, y, r] of gems) {
		ball(g, x, y, r, 0x37d0c8);
		ball(g, x - 1, y - 1, Math.max(1, r - 1), 0x9df3ee);
	}
	ball(g, 15, 19, 1, 0xffffff);
}

function boulder(g: Phaser.GameObjects.Graphics, tone: number): void {
	poly(
		g,
		[
			[8, 30],
			[14, 14],
			[26, 12],
			[34, 26],
			[28, 34],
			[12, 34]
		],
		shade(tone, 0.72)
	);
	poly(
		g,
		[
			[14, 14],
			[26, 12],
			[30, 22],
			[18, 24]
		],
		tone
	);
	poly(
		g,
		[
			[16, 16],
			[24, 15],
			[22, 20],
			[17, 20]
		],
		shade(tone, 1.22)
	);
	// Facet lines.
	g.lineStyle(1, shade(tone, 0.6), 1);
	g.strokeRect(10, 26, 8, 7);
	g.lineBetween(18, 24, 28, 26);
	ellipse(g, 21, 35, 13, 3, 0x000000, 0.16);
}

function oreRock(g: Phaser.GameObjects.Graphics, ore: number): void {
	boulder(g, ROCK);
	// Ore nuggets embedded in the rock face.
	for (const [x, y, r] of [
		[16, 20, 3],
		[24, 24, 3],
		[20, 16, 2],
		[27, 18, 2]
	] as [number, number, number][]) {
		ball(g, x, y, r, ore);
		ball(g, x - 1, y - 1, Math.max(1, r - 1), shade(ore, 1.4));
	}
}

function shellPile(g: Phaser.GameObjects.Graphics): void {
	const shells: [number, number, number][] = [
		[12, 26, 0.0],
		[20, 24, 0.4],
		[27, 27, 0.8],
		[16, 30, 0.2],
		[24, 31, 0.6]
	];
	for (const [x, y, rot] of shells) {
		const w = 7;
		const h = 6;
		ellipse(g, x, y, w, h, 0xe8d5b0);
		g.lineStyle(1, 0xbfa77f, 1);
		g.strokeEllipse(x, y, w * 2, h * 2);
		for (let i = -2; i <= 2; i++) {
			g.lineBetween(x + i * 1.6, y - h + 1, x + i * 1.6, y + h - 1);
		}
		void rot;
	}
}

// ── Creatures ──────────────────────────────────────────────────────────

function crab(g: Phaser.GameObjects.Graphics): void {
	// Legs.
	for (const [x, y] of [
		[8, 22],
		[8, 28],
		[32, 22],
		[32, 28]
	]) {
		rect(g, x, y, 6, 2, 0xc0392b);
	}
	// Claws.
	ball(g, 8, 18, 4, 0xe74c3c);
	ball(g, 32, 18, 4, 0xe74c3c);
	// Body + shell highlight.
	ellipse(g, 20, 22, 12, 9, 0xc0392b);
	ellipse(g, 20, 20, 9, 5, 0xe74c3c);
	// Eyes on stalks.
	rect(g, 15, 10, 2, 6, 0xc0392b);
	rect(g, 23, 10, 2, 6, 0xc0392b);
	ball(g, 16, 9, 2, 0xffffff);
	ball(g, 24, 9, 2, 0xffffff);
	ball(g, 16, 9, 1, 0x111111);
	ball(g, 24, 9, 1, 0x111111);
}

function bird(g: Phaser.GameObjects.Graphics, body: number, wing: number): void {
	ellipse(g, 22, 22, 12, 8, body); // body
	ellipse(g, 32, 18, 6, 6, shade(body, 1.05)); // head
	poly(
		g,
		[
			[37, 18],
			[43, 20],
			[37, 22]
		],
		0xf39c12
	); // beak
	ball(g, 34, 16, 1.5, 0x111111); // eye
	poly(
		g,
		[
			[18, 20],
			[6, 14],
			[12, 26]
		],
		wing
	); // wing
	poly(
		g,
		[
			[20, 18],
			[10, 16],
			[18, 24]
		],
		shade(wing, 1.15)
	);
	rect(g, 18, 28, 2, 5, 0xf39c12); // legs
	rect(g, 24, 28, 2, 5, 0xf39c12);
}

function boar(g: Phaser.GameObjects.Graphics): void {
	const fur = 0x6b4a34;
	// Contact shadow so the animal reads as standing on the ground.
	ellipse(g, 24, 37, 16, 4, 0x000000, 0.2);
	ellipse(g, 22, 22, 15, 10, fur); // body
	ellipse(g, 36, 20, 8, 8, shade(fur, 1.08)); // head
	poly(
		g,
		[
			[42, 20],
			[47, 22],
			[42, 23]
		],
		0xd0c0a0
	); // snout
	ball(g, 37, 17, 1.5, 0x0a0a0a); // eye
	// Tusks.
	poly(
		g,
		[
			[42, 24],
			[46, 27],
			[42, 26]
		],
		0xf1e5c8
	);
	// Legs.
	for (const x of [14, 22, 30]) rect(g, x, 30, 4, 8, shade(fur, 0.7));
	// Bristles.
	for (const x of [16, 20, 24, 28]) rect(g, x, 11, 2, 4, shade(fur, 0.55));
}

function monkey(g: Phaser.GameObjects.Graphics): void {
	const fur = 0x8a5a33;
	const face = 0xd9a679;
	// Contact shadow.
	ellipse(g, 20, 34, 11, 3.5, 0x000000, 0.2);
	ball(g, 20, 24, 11, fur); // body
	ball(g, 20, 14, 7, fur); // head
	ball(g, 20, 15, 5, face); // face patch
	ball(g, 20, 24, 5, face); // belly
	ball(g, 13, 12, 3, fur); // ears
	ball(g, 27, 12, 3, fur);
	ball(g, 17, 13, 1, 0x0a0a0a); // eyes
	ball(g, 23, 13, 1, 0x0a0a0a);
	// Tail.
	rect(g, 29, 24, 6, 2, fur);
	rect(g, 33, 20, 2, 6, fur);
}

function snake(g: Phaser.GameObjects.Graphics): void {
	const green = 0x4caf50;
	// Contact shadow hugging the wavy body.
	ellipse(g, 23, 25, 15, 6, 0x000000, 0.16);
	// Wavy body from stacked segments.
	const path: [number, number][] = [
		[10, 30],
		[14, 24],
		[20, 28],
		[26, 22],
		[32, 26],
		[36, 18]
	];
	for (const [x, y] of path) ball(g, x, y, 4, green);
	for (const [x, y] of path) ball(g, x - 1, y - 1, 2, shade(green, 1.25));
	ball(g, 37, 16, 5, shade(green, 1.1)); // head
	ball(g, 38, 14, 1.5, 0x0a0a0a); // eye
	// Forked tongue.
	rect(g, 41, 17, 4, 1, 0xd6483f);
}

function tiger(g: Phaser.GameObjects.Graphics): void {
	const orange = 0xe08a2b;
	// Contact shadow.
	ellipse(g, 26, 39, 18, 4, 0x000000, 0.2);
	ellipse(g, 24, 24, 17, 11, orange); // body
	ellipse(g, 40, 21, 9, 9, shade(orange, 1.05)); // head
	// Ears.
	poly(
		g,
		[
			[35, 13],
			[38, 6],
			[41, 13]
		],
		0x9c5a15
	);
	poly(
		g,
		[
			[43, 13],
			[46, 6],
			[48, 13]
		],
		0x9c5a15
	);
	// Stripes.
	for (const x of [16, 22, 28] as number[]) {
		rect(g, x, 15, 2, 12, 0x3a2410);
	}
	ball(g, 42, 19, 1.5, 0x0a0a0a); // eye
	// Legs.
	for (const x of [14, 22, 32, 38] as number[]) rect(g, x, 33, 5, 8, shade(orange, 0.8));
}

function crocodile(g: Phaser.GameObjects.Graphics): void {
	const green = 0x4f7d3a;
	// Contact shadow.
	ellipse(g, 24, 32, 20, 4, 0x000000, 0.18);
	// Long flat body.
	ellipse(g, 22, 26, 18, 8, green);
	ellipse(g, 22, 22, 16, 6, shade(green, 1.12));
	poly(
		g,
		[
			[40, 24],
			[44, 20],
			[52, 22],
			[50, 26],
			[42, 28]
		],
		shade(green, 1.05)
	); // snout
	// Teeth ridge.
	for (const x of [44, 47, 50] as number[]) rect(g, x, 25, 2, 2, 0xf5f0e0);
	ball(g, 42, 19, 1.5, 0xf1c40f); // eye
	// Ridge scutes.
	for (const x of [12, 16, 20, 24, 28] as number[]) {
		poly(
			g,
			[
				[x, 18],
				[x + 2, 15],
				[x + 4, 18]
			],
			shade(green, 0.72)
		);
	}
	// Legs.
	rect(g, 12, 30, 5, 6, shade(green, 0.8));
	rect(g, 28, 30, 5, 6, shade(green, 0.8));
}

function wolf(g: Phaser.GameObjects.Graphics): void {
	const grey = 0x8b93a4;
	// Contact shadow.
	ellipse(g, 24, 37, 16, 4, 0x000000, 0.2);
	ellipse(g, 22, 24, 15, 10, grey); // body
	ellipse(g, 37, 22, 8, 8, shade(grey, 1.06)); // head
	poly(
		g,
		[
			[32, 14],
			[34, 8],
			[37, 15]
		],
		0x6a7280
	); // ear
	poly(
		g,
		[
			[39, 15],
			[42, 8],
			[43, 15]
		],
		0x6a7280
	); // ear
	poly(
		g,
		[
			[44, 22],
			[50, 24],
			[44, 26]
		],
		0xb7bdc8
	); // snout
	ball(g, 39, 20, 1.5, 0x0a0a0a); // eye
	// Tail.
	poly(
		g,
		[
			[8, 22],
			[2, 16],
			[6, 26]
		],
		shade(grey, 0.85)
	);
	for (const x of [14, 22, 30] as number[]) rect(g, x, 32, 4, 8, shade(grey, 0.8));
}

/** A komodo dragon: a low, long volcanic lizard with a heavy tail. */
function komodo(g: Phaser.GameObjects.Graphics): void {
	const body = 0x5a6b3a;
	const dark = 0x3f4d2a;
	// Contact shadow.
	ellipse(g, 28, 33, 20, 4, 0x000000, 0.18);
	ellipse(g, 26, 26, 17, 9, body); // torso
	// Long heavy tail.
	poly(
		g,
		[
			[10, 24],
			[0, 20],
			[4, 30],
			[10, 30]
		],
		dark
	);
	// Head + neck.
	ellipse(g, 46, 22, 8, 7, shade(body, 1.06));
	poly(
		g,
		[
			[40, 20],
			[48, 18],
			[44, 28],
			[38, 27]
		],
		shade(body, 1.06)
	);
	ball(g, 48, 20, 1.6, 0xf4d03f); // amber eye
	ball(g, 48, 20, 0.7, 0x0a0a0a);
	// Forked tongue.
	g.lineStyle(1, 0xd9534f, 1);
	g.lineBetween(52, 24, 58, 25);
	g.lineBetween(58, 25, 60, 23);
	g.lineBetween(58, 25, 60, 27);
	// Scaly back ridge.
	for (const x of [18, 24, 30, 36] as number[]) {
		poly(
			g,
			[
				[x, 17],
				[x + 2, 13],
				[x + 4, 17]
			],
			dark
		);
	}
	// Legs with claws.
	for (const x of [16, 30] as number[]) {
		rect(g, x, 32, 5, 7, shade(body, 0.8));
		rect(g, x, 37, 5, 2, dark);
	}
}

function fish(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 22, 22, 12, 8, 0x4aa3d8);
	ellipse(g, 22, 20, 10, 4, 0x7cc6ec);
	poly(
		g,
		[
			[10, 22],
			[2, 16],
			[2, 28]
		],
		0x2c7bb5
	); // tail
	ball(g, 28, 19, 2, 0xffffff);
	ball(g, 28, 19, 1, 0x0a0a0a);
	poly(
		g,
		[
			[22, 14],
			[28, 8],
			[30, 16]
		],
		0x2c7bb5
	); // dorsal fin
}

// ── Player & NPC ───────────────────────────────────────────────────────

/**
 * Player avatar — a friendly Indonesian islander explorer, drawn at 40×56 with
 * higher detail so the character reads clearly at world scale (§15 / §16).
 *
 * The art is built on a 1px grid with deliberate light/shadow: a warm shirt with
 * collar, buttons and sleeve folds; a woven sash; trousers with a knee crease;
 * laced boots; a belt with a brass buckle; and a face with brows, an iris catch-
 * light and a small smile under a wind-blown fringe.
 *
 * Three DIRECTIONAL variants are painted so the character faces where it moves:
 * `down` (front), `up` (back) and `side` (right; mirrored by the scene for left).
 * All shading keeps a consistent top-left light source.
 */

// Character palette (kept local so it is tweakable without touching world tones).
const P_SKIN = 0xf0c69b;
const P_SKIN_D = 0xd2a074;
const P_SKIN_L = 0xffdcb8;
const P_HAIR = 0x2c1d12;
const P_HAIR_L = 0x4a3320;
const P_SHIRT = 0x4f86d6;
const P_SHIRT_L = 0x6ea3ec;
const P_SHIRT_D = 0x33619e;
const P_PANTS = 0x2f4160;
const P_PANTS_D = 0x22304a;
const P_BOOT = 0x4a3220;
const P_BOOT_D = 0x2f1f12;
const P_SASH = 0xe0b13f;
const P_SASH_D = 0xb4882a;
const P_LINE = 0x1d1409; // dark silhouette outline

/** Shared soft contact shadow beneath a 40-wide figure, with a lighter core. */
function pShadow(g: Phaser.GameObjects.Graphics, y: number): void {
	ellipse(g, 20, y, 12, 4, 0x000000, 0.22);
	ellipse(g, 20, y, 8, 2.5, 0x000000, 0.16);
}

/** Both boots + legs, shared by every facing (side tweaks are drawn after). */
function pLegs(g: Phaser.GameObjects.Graphics, dark: boolean): void {
	const pant = dark ? P_PANTS_D : P_PANTS;
	// Thighs / shins.
	rect(g, 13, 36, 5, 12, pant);
	rect(g, 22, 36, 5, 12, pant);
	// Inner-edge shade + a subtle knee crease.
	rect(g, 13, 36, 1, 12, shade(pant, 0.78));
	rect(g, 22, 36, 1, 12, shade(pant, 0.9));
	rect(g, 13, 43, 5, 1, shade(pant, 0.82));
	rect(g, 22, 43, 5, 1, shade(pant, 0.9));
	// Boots: toe box, sole, and a lace line.
	rect(g, 12, 48, 7, 5, P_BOOT);
	rect(g, 21, 48, 7, 5, P_BOOT);
	rect(g, 12, 51, 7, 2, P_BOOT_D);
	rect(g, 21, 51, 7, 2, P_BOOT_D);
	rect(g, 12, 48, 7, 1, shade(P_BOOT, 1.25));
	rect(g, 21, 48, 7, 1, shade(P_BOOT, 1.25));
	rect(g, 14, 49, 3, 1, 0x6b4a2f); // lace
	rect(g, 23, 49, 3, 1, 0x6b4a2f);
}

/** Belt with a brass buckle (over the waist). */
function pBelt(g: Phaser.GameObjects.Graphics): void {
	rect(g, 12, 34, 16, 3, 0x6b4a2f);
	rect(g, 12, 34, 16, 1, 0x855c39);
	rect(g, 18, 33, 5, 4, P_SASH);
	rect(g, 19, 34, 3, 2, 0x8a6a20);
}

/** FRONT-facing player. */
function playerDown(g: Phaser.GameObjects.Graphics): void {
	pShadow(g, 54);

	// Torso — shirt with lit-left / shaded-right volume and a shoulder seam.
	rect(g, 12, 20, 16, 16, P_SHIRT);
	rect(g, 12, 20, 6, 16, P_SHIRT_L);
	rect(g, 23, 20, 5, 16, P_SHIRT_D);
	rect(g, 12, 20, 16, 2, shade(P_SHIRT, 1.3)); // shoulder light
	rect(g, 12, 34, 16, 2, P_SHIRT_D); // lower hem
	// Collar (V opening showing skin).
	rect(g, 17, 20, 6, 4, P_SKIN_D);
	rect(g, 15, 20, 3, 2, P_SHIRT_L);
	rect(g, 22, 20, 3, 2, P_SHIRT_L);
	// Buttons down the centre.
	rect(g, 19, 25, 2, 1, shade(P_SHIRT, 1.4));
	rect(g, 19, 29, 2, 1, shade(P_SHIRT, 1.4));
	// Woven sash across the chest with a highlight.
	rect(g, 22, 22, 5, 12, P_SASH);
	rect(g, 22, 22, 2, 12, shade(P_SASH, 1.2));
	rect(g, 22, 22, 5, 1, P_SASH_D);
	rect(g, 22, 33, 5, 1, P_SASH_D);

	// Arms + hands (sleeves cuffed, hands with a thumb).
	rect(g, 8, 22, 5, 12, P_SHIRT_D); // left sleeve
	rect(g, 27, 22, 5, 12, P_SHIRT_D); // right sleeve
	rect(g, 8, 22, 5, 3, shade(P_SHIRT_D, 1.2));
	rect(g, 27, 22, 5, 3, shade(P_SHIRT_D, 1.2));
	rect(g, 8, 33, 5, 5, P_SKIN); // left hand
	rect(g, 27, 33, 5, 5, P_SKIN);
	rect(g, 8, 37, 5, 1, P_SKIN_D);
	rect(g, 27, 37, 5, 1, P_SKIN_D);
	rect(g, 12, 34, 1, 3, P_SKIN_D); // thumbs
	rect(g, 27, 34, 1, 3, P_SKIN_D);

	pLegs(g, false);
	pBelt(g);

	// Neck.
	rect(g, 16, 18, 8, 4, P_SKIN_D);
	rect(g, 16, 18, 8, 2, shade(P_SKIN_D, 0.85));

	// Head: silhouette outline, face fill, brow/cheek shading.
	rect(g, 11, 4, 18, 16, P_LINE);
	rect(g, 12, 5, 16, 14, P_SKIN);
	rect(g, 12, 5, 16, 3, P_SKIN_L); // forehead light
	rect(g, 12, 16, 16, 3, P_SKIN_D); // jaw shade
	// Ears.
	rect(g, 10, 9, 2, 4, P_SKIN);
	rect(g, 28, 9, 2, 4, P_SKIN);
	rect(g, 10, 9, 1, 4, P_SKIN_D);
	rect(g, 29, 9, 1, 4, P_SKIN_D);

	// Hair: rounded cap that frames the face (never a flat block) with a thick
	// swept fringe, pointed sideburns and a warm sheen. The fringe stops just
	// above the brows so a clear band of forehead + the whole face stay open.
	rect(g, 11, 3, 18, 5, P_HAIR); // cap body
	rect(g, 12, 2, 16, 2, P_HAIR); // rounded top edge
	rect(g, 13, 2, 13, 1, P_HAIR_L); // top light
	rect(g, 11, 3, 3, 9, P_HAIR); // left sideburn
	rect(g, 26, 3, 3, 9, P_HAIR); // right sideburn
	// Swept fringe: asymmetric bangs with a gap over the forehead centre.
	rect(g, 12, 7, 6, 3, P_HAIR);
	rect(g, 23, 7, 4, 2, P_HAIR);
	rect(g, 15, 3, 7, 2, 0x6b4d2c); // sheen highlight
	rect(g, 11, 3, 18, 1, shade(P_HAIR, 0.8)); // dark top rim

	// Face: bold brows, LARGE expressive eyes (read clearly at world scale),
	// a soft nose, rosy cheeks and a small friendly smile.
	rect(g, 13, 9, 5, 1, 0x241a12); // left brow (bold)
	rect(g, 23, 9, 5, 1, 0x241a12); // right brow
	rect(g, 13, 10, 5, 5, 0xffffff); // left eye white
	rect(g, 23, 10, 5, 5, 0xffffff); // right eye white
	rect(g, 14, 11, 3, 4, 0x2f6b4a); // left iris (warm green-brown)
	rect(g, 24, 11, 3, 4, 0x2f6b4a); // right iris
	rect(g, 14, 11, 3, 2, 0x1c1409); // upper lid shadow
	rect(g, 24, 11, 3, 2, 0x1c1409);
	rect(g, 14, 12, 1, 1, 0xffffff); // catchlights
	rect(g, 24, 12, 1, 1, 0xffffff);
	rect(g, 19, 12, 2, 3, P_SKIN_D); // nose shadow
	rect(g, 15, 16, 2, 1, 0xeb8e78); // blush
	rect(g, 24, 16, 2, 1, 0xeb8e78);
	rect(g, 18, 17, 4, 1, 0xa9613f); // smile
	rect(g, 18, 17, 4, 1, 0xa9613f);
}

/** BACK-facing player (seen from behind). */
function playerUp(g: Phaser.GameObjects.Graphics): void {
	pShadow(g, 54);

	// Torso — plain back of the shirt (no collar/buttons), same volume.
	rect(g, 12, 20, 16, 16, P_SHIRT);
	rect(g, 12, 20, 6, 16, P_SHIRT_L);
	rect(g, 23, 20, 5, 16, P_SHIRT_D);
	rect(g, 12, 20, 16, 2, shade(P_SHIRT, 1.3));
	rect(g, 12, 34, 16, 2, P_SHIRT_D);
	// Sash continuing over the shoulder and back.
	rect(g, 22, 21, 5, 13, P_SASH);
	rect(g, 22, 21, 2, 13, shade(P_SASH, 1.2));

	// Arms + hands.
	rect(g, 8, 22, 5, 12, P_SHIRT_D);
	rect(g, 27, 22, 5, 12, P_SHIRT_D);
	rect(g, 8, 22, 5, 3, shade(P_SHIRT_D, 1.2));
	rect(g, 27, 22, 5, 3, shade(P_SHIRT_D, 1.2));
	rect(g, 8, 33, 5, 5, P_SKIN);
	rect(g, 27, 33, 5, 5, P_SKIN);
	rect(g, 8, 37, 5, 1, P_SKIN_D);
	rect(g, 27, 37, 5, 1, P_SKIN_D);

	pLegs(g, true);
	pBelt(g);

	// Neck (mostly hidden by hair).
	rect(g, 16, 18, 8, 4, P_SKIN_D);

	// Head from behind: a solid hair mass with a rounded top, a bold sheen and a
	// shaded nape — no face, as expected when the character faces away.
	rect(g, 11, 4, 18, 16, P_LINE);
	rect(g, 12, 5, 16, 15, P_HAIR);
	rect(g, 12, 3, 16, 2, P_HAIR); // rounded top edge
	rect(g, 13, 3, 13, 1, P_HAIR_L);
	rect(g, 12, 5, 16, 2, P_HAIR_L);
	rect(g, 12, 16, 16, 3, shade(P_HAIR, 0.8)); // nape shade
	rect(g, 15, 6, 10, 4, 0x6b4d2c); // sheen
	rect(g, 10, 10, 2, 8, P_HAIR); // hair falls over ears
	rect(g, 28, 10, 2, 8, P_HAIR);
	rect(g, 11, 4, 18, 1, shade(P_HAIR, 0.8));
}

/** RIGHT-facing player (scene mirrors horizontally for left). */
function playerSide(g: Phaser.GameObjects.Graphics): void {
	pShadow(g, 54);

	// Torso in profile (narrower), lit from the front-left.
	rect(g, 13, 20, 14, 16, P_SHIRT);
	rect(g, 13, 20, 5, 16, P_SHIRT_L);
	rect(g, 24, 20, 3, 16, P_SHIRT_D);
	rect(g, 13, 20, 14, 2, shade(P_SHIRT, 1.3));
	rect(g, 13, 34, 14, 2, P_SHIRT_D);
	// Sash edge visible at the front.
	rect(g, 22, 21, 4, 13, P_SASH);
	rect(g, 22, 21, 2, 13, shade(P_SASH, 1.2));

	// Near arm swung forward, far arm hinted behind the torso.
	rect(g, 9, 22, 5, 13, P_SHIRT_D); // near sleeve
	rect(g, 9, 22, 5, 3, shade(P_SHIRT_D, 1.2));
	rect(g, 9, 34, 5, 5, P_SKIN); // near hand
	rect(g, 9, 38, 5, 1, P_SKIN_D);
	rect(g, 26, 24, 3, 9, shade(P_SHIRT_D, 0.82)); // far arm (behind)

	// Legs in profile: near leg forward, far leg behind.
	rect(g, 15, 36, 5, 12, P_PANTS);
	rect(g, 21, 36, 4, 12, P_PANTS_D); // far leg
	rect(g, 15, 36, 1, 12, shade(P_PANTS, 0.8));
	rect(g, 13, 48, 8, 5, P_BOOT); // near boot (longer toe)
	rect(g, 20, 48, 6, 5, shade(P_BOOT, 0.85)); // far boot
	rect(g, 13, 51, 8, 2, P_BOOT_D);
	rect(g, 20, 51, 6, 2, P_BOOT_D);
	rect(g, 13, 48, 8, 1, shade(P_BOOT, 1.25));

	pBelt(g);

	// Neck.
	rect(g, 16, 18, 7, 4, P_SKIN_D);

	// Head in profile: rounded skull, nose + chin to the right.
	rect(g, 12, 4, 16, 16, P_LINE);
	rect(g, 13, 5, 14, 14, P_SKIN);
	rect(g, 13, 5, 14, 3, P_SKIN_L);
	rect(g, 13, 16, 14, 3, P_SKIN_D);
	rect(g, 27, 10, 2, 4, P_SKIN); // nose
	rect(g, 27, 10, 1, 4, P_SKIN_D);
	rect(g, 13, 9, 2, 4, P_SKIN); // ear
	rect(g, 13, 9, 1, 4, P_SKIN_D);

	// Hair: rounded cap over the back of the head, a bold swept fringe to the
	// right, and a warm sheen — leaving the forehead + eye open.
	rect(g, 12, 3, 15, 7, P_HAIR);
	rect(g, 13, 2, 13, 2, P_HAIR); // rounded top edge
	rect(g, 14, 2, 11, 1, P_HAIR_L);
	rect(g, 12, 3, 5, 12, P_HAIR); // back of head hair
	rect(g, 20, 6, 6, 3, P_HAIR); // fringe sweeping right
	rect(g, 24, 7, 3, 2, P_HAIR); // fringe point
	rect(g, 15, 3, 7, 2, 0x6b4d2c); // sheen
	rect(g, 12, 3, 15, 1, shade(P_HAIR, 0.8));

	// Face profile: bold brow, LARGE eye with catchlight, blush, small smile.
	rect(g, 21, 9, 4, 1, 0x241a12); // brow
	rect(g, 21, 10, 4, 5, 0xffffff); // eye white
	rect(g, 22, 11, 3, 4, 0x2f6b4a); // iris
	rect(g, 22, 11, 3, 2, 0x1c1409); // lid shadow
	rect(g, 22, 12, 1, 1, 0xffffff); // catchlight
	rect(g, 21, 16, 2, 1, 0xeb8e78); // cheek
	rect(g, 25, 17, 2, 1, 0xa9613f); // smile
}

/**
 * A villager NPC, drawn at 40×56 to match the player's scale and readability
 * (§15 / §17): the same silhouette and shading language, with cloth-tinted
 * tunic, a head-wrap and a simple friendly face.
 */
function npc(g: Phaser.GameObjects.Graphics, cloth: number, skin: number): void {
	pShadow(g, 54);

	// Legs.
	rect(g, 13, 36, 5, 12, shade(cloth, 0.6));
	rect(g, 22, 36, 5, 12, shade(cloth, 0.6));
	rect(g, 13, 36, 1, 12, shade(cloth, 0.48));
	rect(g, 12, 48, 7, 5, P_BOOT);
	rect(g, 21, 48, 7, 5, P_BOOT);
	rect(g, 12, 51, 7, 2, P_BOOT_D);
	rect(g, 21, 51, 7, 2, P_BOOT_D);

	// Tunic with volume.
	rect(g, 12, 20, 16, 16, cloth);
	rect(g, 12, 20, 6, 16, shade(cloth, 1.2));
	rect(g, 23, 20, 5, 16, shade(cloth, 0.8));
	rect(g, 12, 20, 16, 2, shade(cloth, 1.35));
	rect(g, 12, 34, 16, 2, shade(cloth, 0.68));

	// Arms + sleeves + hands.
	rect(g, 8, 22, 5, 12, shade(cloth, 0.72));
	rect(g, 27, 22, 5, 12, shade(cloth, 0.72));
	rect(g, 8, 33, 5, 5, skin);
	rect(g, 27, 33, 5, 5, skin);
	rect(g, 8, 37, 5, 1, shade(skin, 0.82));
	rect(g, 27, 37, 5, 1, shade(skin, 0.82));

	// Belt.
	rect(g, 12, 34, 16, 3, shade(cloth, 0.42));

	// Neck + head.
	rect(g, 16, 18, 8, 4, shade(skin, 0.86));
	rect(g, 11, 4, 18, 16, P_LINE);
	rect(g, 12, 5, 16, 14, skin);
	rect(g, 12, 5, 16, 3, shade(skin, 1.1));
	rect(g, 12, 16, 16, 3, shade(skin, 0.88));
	rect(g, 10, 9, 2, 4, skin);
	rect(g, 28, 9, 2, 4, skin);

	// Head-wrap (batik-ish) instead of hair.
	rect(g, 11, 3, 18, 6, shade(cloth, 0.5));
	rect(g, 11, 3, 18, 2, shade(cloth, 0.72));
	rect(g, 11, 3, 3, 9, shade(cloth, 0.5));
	rect(g, 26, 3, 3, 9, shade(cloth, 0.5));
	rect(g, 15, 5, 10, 1, shade(cloth, 0.9)); // wrap band

	// Face.
	rect(g, 14, 9, 4, 1, shade(cloth, 0.4));
	rect(g, 23, 9, 4, 1, shade(cloth, 0.4));
	rect(g, 14, 11, 3, 3, 0x2a2118);
	rect(g, 24, 11, 3, 3, 0x2a2118);
	rect(g, 14, 11, 1, 1, 0xffffff);
	rect(g, 24, 11, 1, 1, 0xffffff);
	rect(g, 18, 16, 4, 1, 0xa9613f);
}

// ── Structures (placed buildings) ──────────────────────────────────────

/**
 * A campfire: ring of stones around crossed logs with a layered flame and
 * glowing embers. Drawn at 48×48 so the fire reads clearly at world scale.
 */
function campfire(g: Phaser.GameObjects.Graphics): void {
	// Ground shadow.
	ellipse(g, 24, 40, 20, 6, 0x000000, 0.18);
	// Stone ring (clustered pebbles around the pit).
	const stones: [number, number, number][] = [
		[8, 34, 4],
		[15, 39, 4],
		[24, 41, 4],
		[33, 39, 4],
		[40, 34, 4],
		[11, 29, 3],
		[37, 29, 3]
	];
	for (const [x, y, r] of stones) {
		ball(g, x, y, r, 0x8a93a6);
		ball(g, x, y - 1, r - 1, 0xa3abbc);
	}
	// Ash bed inside the ring.
	ellipse(g, 24, 34, 12, 4, 0x2b2620);
	ellipse(g, 24, 33, 9, 3, 0x3a332a);
	// Crossed logs.
	rect(g, 12, 30, 24, 4, WOOD);
	rect(g, 12, 30, 24, 1, shade(WOOD, 1.25));
	g.lineStyle(2, WOOD_DARK, 1);
	g.lineBetween(16, 27, 32, 36);
	g.lineBetween(32, 27, 16, 36);
	// Embers glowing between the logs.
	for (const [x, y] of [
		[20, 32],
		[28, 32],
		[24, 33]
	] as [number, number][]) {
		ball(g, x, y, 1.5, 0xf6ad55);
	}
	// Flame: dark base, mid orange, bright core (onion layers).
	poly(
		g,
		[
			[24, 8],
			[32, 22],
			[28, 30],
			[20, 30],
			[16, 22]
		],
		0xc05621
	);
	poly(
		g,
		[
			[24, 12],
			[30, 23],
			[27, 29],
			[21, 29],
			[18, 23]
		],
		0xed8936
	);
	poly(
		g,
		[
			[24, 17],
			[28, 24],
			[26, 28],
			[22, 28],
			[20, 24]
		],
		0xf6ad55
	);
	poly(
		g,
		[
			[24, 21],
			[26, 25],
			[24, 27],
			[22, 25]
		],
		0xfee9a3
	);
	// A couple of drifting sparks.
	ball(g, 19, 12, 1, 0xfbd38d);
	ball(g, 29, 9, 1, 0xfbd38d);
}

/** A small thatch shelter: hut frame with a peaked roof. */
function shelter(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 42, 22, 6, 0x000000, 0.18);
	// Walls.
	rect(g, 10, 26, 28, 16, SAND_DARK);
	rect(g, 10, 26, 28, 3, shade(SAND_DARK, 1.15));
	rect(g, 10, 39, 28, 3, shade(SAND_DARK, 0.85));
	// Doorway.
	rect(g, 20, 32, 8, 10, 0x2b2620);
	// Peaked thatch roof.
	poly(
		g,
		[
			[4, 26],
			[24, 8],
			[44, 26]
		],
		0x8a6b3a
	);
	poly(
		g,
		[
			[8, 26],
			[24, 12],
			[40, 26]
		],
		0xa58449
	);
	// Thatch lines.
	g.lineStyle(1, 0x6b4a2f, 1);
	g.lineBetween(14, 22, 24, 12);
	g.lineBetween(34, 22, 24, 12);
}

/** A simple bed: wooden frame with a straw mattress and pillow. */
function bed(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 34, 22, 6, 0x000000, 0.16);
	rect(g, 6, 18, 36, 16, WOOD);
	rect(g, 6, 18, 36, 3, shade(WOOD, 1.2));
	rect(g, 8, 20, 32, 11, 0xe8dcc0);
	rect(g, 8, 20, 32, 4, 0xf3ecd8);
	// Pillow.
	rect(g, 10, 20, 8, 8, 0xf7f3e8);
	rect(g, 10, 20, 8, 2, 0xffffff);
	// Blanket.
	rect(g, 22, 20, 18, 11, 0x3b7dd8);
	rect(g, 22, 20, 18, 3, shade(0x3b7dd8, 1.2));
}

/** A storage chest: banded wooden box with a metal lock. */
function storage(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 36, 18, 5, 0x000000, 0.18);
	rect(g, 9, 16, 30, 20, 0x8a5a2b);
	rect(g, 9, 16, 30, 5, 0xa4713a);
	rect(g, 9, 31, 30, 5, 0x6b4420);
	// lid split + planks.
	g.lineStyle(2, 0x5f3d1c, 1);
	g.lineBetween(9, 26, 39, 26);
	g.lineBetween(18, 16, 18, 36);
	g.lineBetween(30, 16, 30, 36);
	// metal bands.
	rect(g, 14, 16, 2, 20, 0x9aa2ae);
	rect(g, 32, 16, 2, 20, 0x9aa2ae);
	// lock.
	rect(g, 21, 24, 6, 5, 0xf1c40f);
	ball(g, 24, 26, 1, 0x7a5a10);
}

/** A workbench: table with tools laid out. */
function workbench(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 37, 20, 5, 0x000000, 0.16);
	// Legs.
	rect(g, 9, 30, 4, 8, WOOD_DARK);
	rect(g, 35, 30, 4, 8, WOOD_DARK);
	// Table top.
	rect(g, 6, 20, 36, 12, WOOD);
	rect(g, 6, 20, 36, 3, shade(WOOD, 1.25));
	rect(g, 6, 29, 36, 3, WOOD_DARK);
	// A saw + a hammer on top.
	rect(g, 10, 17, 10, 2, 0xb0b6c2);
	poly(
		g,
		[
			[20, 18],
			[24, 15],
			[26, 18]
		],
		0x8a5a2b
	);
	rect(g, 30, 15, 3, 6, 0x8a5a2b);
	rect(g, 28, 14, 7, 3, 0x5a6375);
}

/** An open-air cooking station: a stone hearth with a pot on a tripod. */
function cookingStation(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 40, 22, 6, 0x000000, 0.18);
	// Stone hearth.
	ellipse(g, 24, 34, 16, 6, 0x6b7385);
	ellipse(g, 24, 32, 13, 5, 0x8a93a6);
	// Fire beneath the pot.
	poly(
		g,
		[
			[24, 22],
			[30, 30],
			[18, 30]
		],
		0xed8936
	);
	poly(
		g,
		[
			[24, 25],
			[28, 30],
			[20, 30]
		],
		0xf6ad55
	);
	// Tripod legs.
	g.lineStyle(2, WOOD_DARK, 1);
	g.lineBetween(12, 32, 24, 12);
	g.lineBetween(36, 32, 24, 12);
	// Pot.
	ellipse(g, 24, 16, 9, 6, 0x4a4f5a);
	ellipse(g, 24, 14, 8, 4, 0x6b7180);
	rect(g, 15, 15, 18, 2, 0x2f333b);
}

/** A water collector: a barrel catching rain, with a tap. */
function waterCollector(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 38, 18, 5, 0x000000, 0.16);
	// Barrel body.
	rect(g, 12, 14, 24, 22, 0x7a5230);
	rect(g, 12, 14, 24, 4, 0x93663c);
	rect(g, 12, 32, 24, 4, 0x5f3d1c);
	rect(g, 12, 14, 4, 22, shade(0x7a5230, 1.15));
	// Bands.
	rect(g, 10, 18, 28, 2, 0x9aa2ae);
	rect(g, 10, 30, 28, 2, 0x9aa2ae);
	// Water surface visible at the top.
	ellipse(g, 24, 15, 10, 3, WATER_LIGHT);
	// Tap.
	rect(g, 34, 24, 4, 3, 0x9aa2ae);
	ball(g, 38, 26, 1.5, 0x57a9dd);
}

/** A tilled farm plot: dark soil rows with sprouts. */
function farmPlot(g: Phaser.GameObjects.Graphics): void {
	rect(g, 6, 12, 36, 26, 0x5a3b22);
	rect(g, 8, 14, 32, 22, 0x6b4a2f);
	// Furrows.
	for (const y of [18, 24, 30] as number[]) {
		rect(g, 8, y, 32, 3, 0x4a3220);
	}
	// Sprouts on the rows.
	for (const [x, y] of [
		[14, 16],
		[24, 16],
		[34, 16],
		[14, 22],
		[24, 22],
		[34, 22],
		[14, 28],
		[24, 28],
		[34, 28]
	] as [number, number][]) {
		rect(g, x, y, 1, 3, 0x4a7d3a);
		ball(g, x, y - 1, 2, LEAF);
	}
}

/** A wooden fence segment: two posts with rails. */
function fence(g: Phaser.GameObjects.Graphics): void {
	rect(g, 8, 12, 4, 26, WOOD);
	rect(g, 36, 12, 4, 26, WOOD);
	rect(g, 8, 12, 2, 26, shade(WOOD, 1.2));
	rect(g, 36, 12, 2, 26, shade(WOOD, 1.2));
	rect(g, 8, 18, 32, 3, shade(WOOD, 1.1));
	rect(g, 8, 28, 32, 3, shade(WOOD, 1.1));
	ellipse(g, 24, 39, 18, 4, 0x000000, 0.14);
}

/** A torch: a wooden post topped with a burning flame. */
function torch(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 40, 8, 4, 0x000000, 0.16);
	rect(g, 22, 20, 4, 20, WOOD);
	rect(g, 22, 20, 2, 20, shade(WOOD, 1.2));
	// Flame.
	poly(
		g,
		[
			[24, 6],
			[30, 18],
			[18, 18]
		],
		0xed8936
	);
	poly(
		g,
		[
			[24, 10],
			[28, 18],
			[20, 18]
		],
		0xf6ad55
	);
	poly(
		g,
		[
			[24, 14],
			[26, 18],
			[22, 18]
		],
		0xfee9a3
	);
}

/** A house: a pitched-roof cottage with a door and windows. */
function house(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 32, 52, 30, 7, 0x000000, 0.18);
	// Walls.
	rect(g, 10, 30, 44, 22, SAND);
	rect(g, 10, 30, 44, 4, shade(SAND, 1.1));
	rect(g, 10, 48, 44, 4, SAND_DARK);
	// Roof.
	poly(
		g,
		[
			[4, 32],
			[32, 8],
			[60, 32]
		],
		0x8a3b2f
	);
	poly(
		g,
		[
			[10, 32],
			[32, 12],
			[54, 32]
		],
		0xa8503e
	);
	// Door + windows.
	rect(g, 28, 38, 10, 14, 0x5f3d1c);
	rect(g, 37, 44, 2, 3, 0xf1c40f);
	rect(g, 16, 38, 8, 8, 0x8fd0ee);
	rect(g, 42, 38, 8, 8, 0x8fd0ee);
	g.lineStyle(1, 0x5a6375, 1);
	g.strokeRect(16, 38, 8, 8);
	g.strokeRect(42, 38, 8, 8);
}

/** A wooden dock: planks on posts extending over water. */
function dock(g: Phaser.GameObjects.Graphics): void {
	// Water hint.
	rect(g, 0, 30, 64, 20, WATER, 0.5);
	// Posts.
	rect(g, 10, 24, 4, 22, WOOD_DARK);
	rect(g, 31, 24, 4, 22, WOOD_DARK);
	rect(g, 52, 24, 4, 22, WOOD_DARK);
	// Deck planks.
	rect(g, 4, 22, 56, 8, WOOD);
	rect(g, 4, 22, 56, 2, shade(WOOD, 1.25));
	for (const x of [8, 20, 32, 44, 56] as number[]) rect(g, x, 22, 1, 8, WOOD_DARK);
}

/** A boat workshop: an open shed with a boat hull under construction. */
function boatWorkshop(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 32, 52, 30, 7, 0x000000, 0.18);
	// Posts + roof.
	rect(g, 8, 20, 4, 32, WOOD_DARK);
	rect(g, 52, 20, 4, 32, WOOD_DARK);
	rect(g, 4, 14, 56, 8, 0x8a6b3a);
	rect(g, 4, 14, 56, 3, 0xa58449);
	// Boat hull under construction.
	poly(
		g,
		[
			[16, 36],
			[48, 36],
			[42, 50],
			[22, 50]
		],
		0x8a5a2b
	);
	poly(
		g,
		[
			[18, 38],
			[46, 38],
			[41, 48],
			[23, 48]
		],
		0xa4713a
	);
	// Ribs.
	g.lineStyle(1, WOOD_DARK, 1);
	g.lineBetween(24, 36, 26, 50);
	g.lineBetween(32, 36, 32, 50);
	g.lineBetween(40, 36, 38, 50);
}

/** A drying rack: a frame with fish and strips hanging from a top bar. */
function dryingRack(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 38, 20, 5, 0x000000, 0.14);
	rect(g, 8, 14, 3, 24, WOOD);
	rect(g, 37, 14, 3, 24, WOOD);
	rect(g, 6, 14, 36, 3, shade(WOOD, 1.2));
	// Hanging fish + strips.
	for (const [x, y, h] of [
		[14, 17, 10],
		[22, 17, 13],
		[30, 17, 9],
		[36, 17, 12]
	] as [number, number, number][]) {
		rect(g, x, y, 3, h, 0xd8a24a);
		ball(g, x + 1, y, 2, 0xe8b95e);
	}
}

/** A watchtower: a tall stilted platform with a thatch cap. */
function watchtower(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 26, 52, 20, 6, 0x000000, 0.18);
	// Legs.
	g.lineStyle(3, WOOD_DARK, 1);
	g.lineBetween(14, 52, 20, 26);
	g.lineBetween(38, 52, 32, 26);
	g.lineBetween(26, 52, 26, 26);
	// Cross braces.
	g.lineStyle(2, WOOD, 1);
	g.lineBetween(16, 44, 36, 44);
	g.lineBetween(18, 34, 34, 34);
	// Platform.
	rect(g, 14, 22, 24, 6, WOOD);
	rect(g, 14, 22, 24, 2, shade(WOOD, 1.25));
	// Thatch canopy.
	poly(
		g,
		[
			[10, 22],
			[26, 6],
			[42, 22]
		],
		0x8a6b3a
	);
	poly(
		g,
		[
			[14, 22],
			[26, 10],
			[38, 22]
		],
		0xa58449
	);
}

/** A garden lamp: a post with a glowing glass lantern. */
function gardenLamp(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 40, 9, 4, 0x000000, 0.16);
	rect(g, 22, 22, 4, 18, 0x4a4f5a);
	rect(g, 22, 22, 2, 18, 0x6b7180);
	// Lantern box.
	rect(g, 17, 12, 14, 12, 0x4a4f5a);
	rect(g, 19, 14, 10, 8, 0xfee9a3);
	// Glow.
	ball(g, 24, 18, 4, 0xfbd38d, 0xf6ad55);
	rect(g, 16, 10, 16, 3, 0x2f333b);
}

/** A well: a round stone wall with a peaked roof and a bucket rope. */
function well(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 26, 48, 24, 6, 0x000000, 0.18);
	// Stone rim.
	ellipse(g, 26, 40, 16, 8, 0x6b7385);
	ellipse(g, 26, 38, 14, 6, 0x8a93a6);
	ellipse(g, 26, 37, 9, 4, 0x1b2733);
	// Posts + roof.
	rect(g, 12, 18, 3, 22, WOOD);
	rect(g, 37, 18, 3, 22, WOOD);
	poly(
		g,
		[
			[6, 20],
			[26, 6],
			[46, 20]
		],
		0x8a6b3a
	);
	poly(
		g,
		[
			[10, 20],
			[26, 9],
			[42, 20]
		],
		0xa58449
	);
	// Bucket on a rope.
	rect(g, 24, 20, 1, 8, 0x5f3d1c);
	rect(g, 22, 27, 6, 5, 0x8a5a2b);
}

/** A forge: a stone furnace with a glowing mouth and an anvil. */
function forge(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 26, 50, 26, 6, 0x000000, 0.2);
	// Furnace body.
	rect(g, 12, 20, 28, 28, 0x4a3548);
	rect(g, 12, 20, 28, 4, 0x5f4660);
	rect(g, 12, 44, 28, 4, 0x35253a);
	// Chimney.
	rect(g, 20, 8, 12, 14, 0x3a2b3f);
	// Glowing mouth.
	ellipse(g, 26, 36, 8, 6, 0xff6b1a);
	ellipse(g, 26, 35, 5, 4, 0xffc46b);
	// Anvil.
	rect(g, 42, 40, 12, 4, 0x5a6375);
	rect(g, 46, 44, 4, 5, 0x3f454f);
	poly(
		g,
		[
			[42, 40],
			[54, 40],
			[58, 36],
			[40, 36]
		],
		0x6b7385
	);
}

/**
 * A construction scaffold: a rough frame with partial materials and a wooden
 * "?"-free site marker. Shown while a building is being raised, so the player
 * sees visible progress instead of an unexplained empty plot.
 */
function scaffold(g: Phaser.GameObjects.Graphics): void {
	ellipse(g, 24, 40, 20, 6, 0x000000, 0.16);
	// Corner posts.
	rect(g, 8, 16, 3, 26, WOOD);
	rect(g, 37, 16, 3, 26, WOOD);
	// Cross poles.
	rect(g, 8, 16, 32, 3, WOOD_DARK);
	rect(g, 8, 38, 32, 3, WOOD_DARK);
	g.lineStyle(2, shade(WOOD, 1.15), 1);
	g.lineBetween(9, 38, 40, 16);
	g.lineBetween(9, 16, 40, 38);
	// A small stack of planks + stones on the ground.
	rect(g, 14, 34, 12, 3, shade(WOOD, 1.1));
	rect(g, 14, 31, 12, 3, WOOD);
	ball(g, 32, 35, 3, 0x8a93a6);
	ball(g, 36, 36, 2, 0x8a93a6);
}

// ── Public painters ────────────────────────────────────────────────────
/**
 * Draw every sprite texture the world needs. Idempotent; call once per scene
 * (BootScene) before the world renders.
 */
export function ensureSprites(scene: Phaser.Scene): void {
	const P = (key: string, w: number, h: number, fn: (g: Phaser.GameObjects.Graphics) => void) =>
		paint(scene, key, w, h, (g) => fn(g));

	// Ground tiles.
	P(SPRITE_KEYS.tileGrass, TILE, TILE, (g) => grassTile(g, GRASS, 0x2c5a36));
	P(SPRITE_KEYS.tileSand, TILE, TILE, (g) => sandTile(g, SAND, SAND_DARK));
	P(SPRITE_KEYS.tileRock, TILE, TILE, (g) => rockTile(g));

	// Trees / plants.
	P(SPRITE_KEYS.tree, 48, 48, (g) => broadleafTree(g, LEAF));
	P(SPRITE_KEYS.pine, 48, 48, (g) => pineTree(g, 0x2f6b46));
	P(SPRITE_KEYS.palm, 48, 48, (g) => palmTree(g));
	P(SPRITE_KEYS.bamboo, 48, 48, (g) => bambooGrove(g));
	P(SPRITE_KEYS.bush, 40, 32, (g) => bush(g, false));
	P(SPRITE_KEYS.berryBush, 40, 32, (g) => bush(g, true));
	P(SPRITE_KEYS.herb, 32, 32, (g) => herbPatch(g));
	P(SPRITE_KEYS.mushroom, 32, 32, (g) => mushroomPatch(g));
	P(SPRITE_KEYS.rarePlant, 40, 36, (g) => rarePlant(g));

	// Rocks & ore.
	P(SPRITE_KEYS.rock, 44, 40, (g) => boulder(g, ROCK));
	P(SPRITE_KEYS.ironVein, 44, 40, (g) => oreRock(g, 0xb0b6c2));
	P(SPRITE_KEYS.goldVein, 44, 40, (g) => oreRock(g, 0xf1c40f));
	P(SPRITE_KEYS.shellPile, 36, 34, (g) => shellPile(g));
	// Distinct coastal / terrain props (previously shared the boulder art).
	P(SPRITE_KEYS.clayMound, 44, 36, (g) => clayMound(g));
	P(SPRITE_KEYS.saltFlat, 44, 34, (g) => saltFlat(g));
	P(SPRITE_KEYS.sandBank, 44, 34, (g) => sandBank(g));
	P(SPRITE_KEYS.ruinCache, 44, 38, (g) => ruinCache(g));
	P(SPRITE_KEYS.oysterBed, 44, 34, (g) => oysterBed(g));
	P(SPRITE_KEYS.obsidianRock, 44, 38, (g) => obsidianRock(g));
	P(SPRITE_KEYS.sulfurVent, 44, 36, (g) => sulfurVent(g));
	P(SPRITE_KEYS.gemVein, 44, 40, (g) => gemVein(g));
	P(SPRITE_KEYS.fish, 44, 44, (g) => fish(g));

	// Creatures.
	P(SPRITE_KEYS.crab, 40, 32, (g) => crab(g));
	P(SPRITE_KEYS.seagull, 44, 36, (g) => bird(g, 0xf2f2f2, 0xd0d5dc));
	P(SPRITE_KEYS.hawk, 44, 36, (g) => bird(g, 0x8a5a33, 0x5f3d22));
	P(SPRITE_KEYS.boar, 48, 40, (g) => boar(g));
	P(SPRITE_KEYS.monkey, 40, 40, (g) => monkey(g));
	P(SPRITE_KEYS.snake, 46, 40, (g) => snake(g));
	P(SPRITE_KEYS.tiger, 52, 44, (g) => tiger(g));
	P(SPRITE_KEYS.crocodile, 56, 40, (g) => crocodile(g));
	P(SPRITE_KEYS.wolf, 52, 42, (g) => wolf(g));
	P(SPRITE_KEYS.komodo, 60, 42, (g) => komodo(g));

	// Actors & structures.
	P(SPRITE_KEYS.player, 40, 56, (g) => playerDown(g));
	P(SPRITE_KEYS.playerDown, 40, 56, (g) => playerDown(g));
	P(SPRITE_KEYS.playerUp, 40, 56, (g) => playerUp(g));
	P(SPRITE_KEYS.playerSide, 40, 56, (g) => playerSide(g));
	P(SPRITE_KEYS.npc, 40, 56, (g) => npc(g, 0x63b3ed, 0xe0b088));

	// Placed structures.
	P(SPRITE_KEYS.campfire, 48, 48, (g) => campfire(g));
	P(SPRITE_KEYS.shelter, 48, 48, (g) => shelter(g));
	P(SPRITE_KEYS.bed, 48, 40, (g) => bed(g));
	P(SPRITE_KEYS.storage, 48, 44, (g) => storage(g));
	P(SPRITE_KEYS.workbench, 48, 44, (g) => workbench(g));
	P(SPRITE_KEYS.cookingStation, 48, 48, (g) => cookingStation(g));
	P(SPRITE_KEYS.waterCollector, 48, 44, (g) => waterCollector(g));
	P(SPRITE_KEYS.farmPlot, 48, 44, (g) => farmPlot(g));
	P(SPRITE_KEYS.fence, 48, 44, (g) => fence(g));
	P(SPRITE_KEYS.torch, 48, 44, (g) => torch(g));
	P(SPRITE_KEYS.house, 64, 56, (g) => house(g));
	P(SPRITE_KEYS.dock, 64, 52, (g) => dock(g));
	P(SPRITE_KEYS.boatWorkshop, 64, 56, (g) => boatWorkshop(g));
	P(SPRITE_KEYS.dryingRack, 48, 44, (g) => dryingRack(g));
	P(SPRITE_KEYS.watchtower, 52, 56, (g) => watchtower(g));
	P(SPRITE_KEYS.lamp, 48, 44, (g) => gardenLamp(g));
	P(SPRITE_KEYS.well, 52, 52, (g) => well(g));
	P(SPRITE_KEYS.forge, 60, 56, (g) => forge(g));
	P(SPRITE_KEYS.scaffold, 48, 48, (g) => scaffold(g));
}

/** Colour helpers re-exported for other renderers. */
export const PALETTE = { GRASS, GRASS_DARK, SAND, SAND_DARK, ROCK, WOOD, LEAF, WATER, WATER_LIGHT };

export { mix };
