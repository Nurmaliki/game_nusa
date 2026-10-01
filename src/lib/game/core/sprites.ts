import Phaser from 'phaser';
import { ball, ellipse, mix, paint, poly, rect, shade, vgrad } from './art';

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
const GRASS = 0x3f7d4f;
const GRASS_DARK = 0x2f5f3a;
const SAND = 0xd8c48a;
const SAND_DARK = 0xb8a06a;
const ROCK = 0x8a93a6;
const ROCK_DARK = 0x5a6375;
const WOOD = 0x6b4a2f;
const WOOD_DARK = 0x4a3220;
const LEAF = 0x3f9d4f;
const LEAF_DARK = 0x2c7339;
const LEAF_LIGHT = 0x66c46f;
const WATER = 0x2c7bb5;
const WATER_LIGHT = 0x57a9dd;
const SKIN = 0xe0b088;
const CLOTH = 0x3b7dd8;
const CLOTH_DARK = 0x2a5aa0;

// ── Ground tiles (32×32) ───────────────────────────────────────────────

const TILE = 32;

function grassTile(g: Phaser.GameObjects.Graphics, base: number, accent: number): void {
	// Flat base with scattered blades — NO vertical gradient (a per-tile gradient
	// tiles into visible horizontal bands).
	rect(g, 0, 0, TILE, TILE, base);
	// A few darker patches for organic variation.
	ellipse(g, 8, 10, 6, 4, shade(base, 0.9), 0.5);
	ellipse(g, 24, 22, 7, 5, shade(base, 0.92), 0.45);
	ellipse(g, 18, 5, 5, 3, shade(base, 1.06), 0.4);
	// Scattered blades of grass.
	const blades: [number, number][] = [
		[5, 8],
		[11, 20],
		[17, 6],
		[23, 15],
		[27, 25],
		[8, 27],
		[20, 29],
		[14, 13]
	];
	for (const [x, y] of blades) {
		rect(g, x, y, 1, 4, accent);
		rect(g, x + 1, y + 1, 1, 3, shade(accent, 1.15));
	}
}

function sandTile(g: Phaser.GameObjects.Graphics, base: number, accent: number): void {
	rect(g, 0, 0, TILE, TILE, base);
	ellipse(g, 10, 12, 6, 4, shade(base, 0.94), 0.5);
	ellipse(g, 24, 20, 7, 5, shade(base, 1.05), 0.4);
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
	rect(g, 3, 12, 9, 1, shade(base, 0.88));
	rect(g, 20, 22, 8, 1, shade(base, 0.88));
}

function rockTile(g: Phaser.GameObjects.Graphics): void {
	rect(g, 0, 0, TILE, TILE, ROCK_DARK);
	ellipse(g, 12, 12, 8, 6, shade(ROCK_DARK, 1.14), 0.6);
	ellipse(g, 24, 22, 8, 6, shade(ROCK_DARK, 0.9), 0.5);
	// Cracks + faceted chunks.
	g.lineStyle(1, shade(ROCK_DARK, 0.82), 1);
	g.strokeRect(2, 2, 12, 11);
	g.strokeRect(16, 4, 13, 10);
	g.strokeRect(6, 17, 20, 12);
	rect(g, 3, 3, 10, 3, shade(ROCK, 1.02));
	rect(g, 18, 6, 9, 2, shade(ROCK, 1.02));
	rect(g, 7, 18, 16, 2, shade(ROCK, 0.96));
}

// ── Trees ──────────────────────────────────────────────────────────────

function broadleafTree(g: Phaser.GameObjects.Graphics, leaf: number): void {
	// Trunk.
	rect(g, 22, 30, 5, 16, WOOD);
	rect(g, 22, 30, 2, 16, shade(WOOD, 1.18));
	rect(g, 26, 30, 1, 16, WOOD_DARK);
	// Root flare.
	rect(g, 19, 44, 11, 3, WOOD_DARK);
	// Layered canopy: dark base, mid, light highlight.
	ball(g, 24, 22, 16, shade(leaf, 0.82));
	ball(g, 18, 26, 11, shade(leaf, 0.95));
	ball(g, 31, 26, 11, shade(leaf, 0.95));
	ball(g, 24, 16, 11, leaf);
	ball(g, 24, 13, 7, shade(leaf, 1.15));
	rect(g, 21, 9, 3, 3, shade(leaf, 1.3));
	// shadow under canopy
	ellipse(g, 24, 34, 12, 3, 0x000000, 0.14);
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
	// Curved trunk built from stacked blocks.
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
		rect(g, x, y, 2, 5, shade(WOOD, 1.18));
	}
	// Fronds radiating from the crown.
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
		const mid: [number, number][] = f.map(([x, y]) => [x, y] as [number, number]);
		poly(g, mid, LEAF);
	}
	// Coconuts.
	ball(g, 28, 21, 3, 0x5a3b22);
	ball(g, 33, 22, 3, 0x6b4a2f);
	ellipse(g, 26, 46, 12, 3, 0x000000, 0.16);
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
	ball(g, 14, 18, 9, LEAF_DARK);
	ball(g, 26, 18, 9, LEAF_DARK);
	ball(g, 20, 14, 10, LEAF);
	ball(g, 20, 12, 6, LEAF_LIGHT);
	if (withBerries) {
		for (const [x, y] of [
			[13, 16],
			[24, 15],
			[19, 22],
			[28, 20]
		]) {
			ball(g, x, y, 2, 0xd6483f);
		}
	}
	ellipse(g, 20, 28, 12, 3, 0x000000, 0.14);
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

function player(g: Phaser.GameObjects.Graphics): void {
	// Shadow.
	ellipse(g, 16, 28, 9, 3, 0x000000, 0.22);
	// Legs.
	rect(g, 12, 22, 3, 7, 0x2b3a55);
	rect(g, 17, 22, 3, 7, 0x2b3a55);
	// Torso.
	vgrad(g, 10, 12, 12, 12, CLOTH, CLOTH_DARK);
	rect(g, 10, 12, 4, 12, shade(CLOTH, 1.15));
	// Arms.
	rect(g, 7, 14, 3, 9, SKIN);
	rect(g, 22, 14, 3, 9, SKIN);
	// Head.
	rect(g, 11, 3, 10, 9, SKIN);
	rect(g, 11, 3, 10, 3, 0x3a2a1a); // hair
	rect(g, 11, 3, 3, 5, 0x3a2a1a);
	// Face hint.
	rect(g, 18, 8, 2, 2, 0x3a2a1a);
	rect(g, 13, 8, 2, 2, 0x3a2a1a);
	// Belt.
	rect(g, 10, 21, 12, 2, 0x6b4a2f);
}

function npc(g: Phaser.GameObjects.Graphics, cloth: number, skin: number): void {
	ellipse(g, 16, 28, 9, 3, 0x000000, 0.22);
	rect(g, 12, 22, 3, 7, shade(cloth, 0.7));
	rect(g, 17, 22, 3, 7, shade(cloth, 0.7));
	vgrad(g, 10, 12, 12, 12, cloth, shade(cloth, 0.8));
	rect(g, 7, 14, 3, 9, skin);
	rect(g, 22, 14, 3, 9, skin);
	rect(g, 11, 3, 10, 9, skin);
	rect(g, 11, 3, 10, 3, shade(cloth, 0.6));
	rect(g, 13, 8, 2, 2, 0x2a2118);
	rect(g, 18, 8, 2, 2, 0x2a2118);
	rect(g, 10, 21, 12, 2, shade(cloth, 0.55));
}

// ── Public painters ────────────────────────────────────────────────────

export const SPRITE_KEYS = {
	player: 'sprite_player',
	tree: 'sprite_tree',
	pine: 'sprite_pine',
	palm: 'sprite_palm',
	bamboo: 'sprite_bamboo',
	rock: 'sprite_rock',
	ironVein: 'sprite_iron_vein',
	goldVein: 'sprite_gold_vein',
	bush: 'sprite_bush',
	berryBush: 'sprite_berry_bush',
	herb: 'sprite_herb',
	mushroom: 'sprite_mushroom',
	rarePlant: 'sprite_rare_plant',
	shellPile: 'sprite_shell_pile',
	fish: 'sprite_fish',
	crab: 'sprite_crab',
	seagull: 'sprite_seagull',
	boar: 'sprite_boar',
	monkey: 'sprite_monkey',
	snake: 'sprite_snake',
	hawk: 'sprite_hawk',
	tiger: 'sprite_tiger',
	crocodile: 'sprite_crocodile',
	wolf: 'sprite_wolf',
	npc: 'sprite_npc',
	tileGrass: 'tile_grass',
	tileSand: 'tile_sand',
	tileRock: 'tile_rock'
} as const;

/** Biome-agnostic key for a resource node type (falls back to a generic). */
export function resourceTexture(nodeTypeId: string): string {
	switch (nodeTypeId) {
		case 'tree':
			return SPRITE_KEYS.tree;
		case 'hardwood_tree':
			return SPRITE_KEYS.pine;
		case 'palm':
			return SPRITE_KEYS.palm;
		case 'bamboo_grove':
			return SPRITE_KEYS.bamboo;
		case 'rock':
			return SPRITE_KEYS.rock;
		case 'clay_mound':
			return SPRITE_KEYS.rock;
		case 'iron_vein':
			return SPRITE_KEYS.ironVein;
		case 'gold_vein':
			return SPRITE_KEYS.goldVein;
		case 'bush':
			return SPRITE_KEYS.berryBush;
		case 'herb_patch':
			return SPRITE_KEYS.herb;
		case 'mushroom_patch':
			return SPRITE_KEYS.mushroom;
		case 'rare_plant':
			return SPRITE_KEYS.rarePlant;
		case 'shell_pile':
			return SPRITE_KEYS.shellPile;
		case 'oyster_bed':
			return SPRITE_KEYS.shellPile;
		case 'salt_flat':
			return SPRITE_KEYS.rock;
		case 'sand_bank':
			return SPRITE_KEYS.rock;
		case 'ruin_cache':
			return SPRITE_KEYS.rock;
		case 'fish_shoal':
			return SPRITE_KEYS.fish;
		default:
			return SPRITE_KEYS.bush;
	}
}

/** Key for a creature species id (falls back to a generic critter). */
export function creatureTexture(creatureId: string): string {
	switch (creatureId) {
		case 'crab':
			return SPRITE_KEYS.crab;
		case 'seagull':
			return SPRITE_KEYS.seagull;
		case 'boar':
			return SPRITE_KEYS.boar;
		case 'monkey':
			return SPRITE_KEYS.monkey;
		case 'snake':
			return SPRITE_KEYS.snake;
		case 'hawk':
			return SPRITE_KEYS.hawk;
		case 'tiger':
			return SPRITE_KEYS.tiger;
		case 'crocodile':
			return SPRITE_KEYS.crocodile;
		case 'wolf':
			return SPRITE_KEYS.wolf;
		default:
			return SPRITE_KEYS.monkey;
	}
}

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

	// Actors & structures.
	P(SPRITE_KEYS.player, 32, 32, (g) => player(g));
	P(SPRITE_KEYS.npc, 32, 32, (g) => npc(g, 0x63b3ed, 0xe0b088));
}

/** Colour helpers re-exported for other renderers. */
export const PALETTE = { GRASS, GRASS_DARK, SAND, SAND_DARK, ROCK, WOOD, LEAF, WATER, WATER_LIGHT };

export { mix };
