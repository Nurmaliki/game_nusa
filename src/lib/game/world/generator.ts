/**
 * Deterministic world-generation primitives (see §7 / §8 / §60).
 *
 * These are the shared seeding utilities used by the chunk manager to derive
 * reproducible content from (worldSeed, coordinates). Keeping them isolated
 * makes world generation fully unit-testable and independent of Phaser.
 */

/** Fast, well-distributed 32-bit PRNG. Returns a function producing [0,1). */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Stable string hash (FNV-1a) for deriving per-key seeds. */
export function hashString(str: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** Weighted pick from a `{ key: weight }` table using the given rng. */
export function weightedPick(weights: Record<string, number>, rng: () => number): string {
	const keys = Object.keys(weights);
	const total = keys.reduce((a, k) => a + weights[k], 0);
	let roll = rng() * total;
	for (const k of keys) {
		roll -= weights[k];
		if (roll <= 0) return k;
	}
	return keys[keys.length - 1];
}
