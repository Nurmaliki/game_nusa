/**
 * Time-of-day lighting (see §20 lighting / §21 sunset / §22 night).
 *
 * Pure, engine-free so the curve is unit-tested. The renderer applies these as
 * two camera-fixed overlays:
 *
 *  - a MULTIPLY "ambient" tint that darkens/cools the world (night = deep blue,
 *    not flat black), and
 *  - an ADDITIVE "warmth" tint that adds golden light at dawn/sunset so those
 *    hours feel warm rather than merely darker.
 *
 * Both are smooth functions of the in-game hour, so transitions are gradual —
 * never a sudden switch.
 */

export interface Lighting {
	/** Multiply-tint colour applied over the world (ambient shade). */
	ambientColor: number;
	/** Multiply-tint strength 0..1 (0 = no shade, higher = darker). */
	ambientAlpha: number;
	/** Additive-tint colour for warm golden hours (dawn/sunset). */
	warmColor: number;
	/** Additive-tint strength 0..1. */
	warmAlpha: number;
}

/** Linear interpolation of two 0xRRGGBB colours. */
function mix(a: number, b: number, t: number): number {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const bl = Math.round(ab + (bb - ab) * t);
	return (r << 16) | (g << 8) | bl;
}

/** Ramps 0→1 as x goes from edge0→edge1, clamped, with smoothstep easing. */
function smoothRamp(x: number, edge0: number, edge1: number): number {
	let t = (x - edge0) / (edge1 - edge0);
	t = Math.max(0, Math.min(1, t));
	return t * t * (3 - 2 * t);
}

/**
 * Lighting for a given in-game hour (0..24).
 *
 * Key points:
 *  - 00:00 midnight — deep blue, strongest ambient.
 *  - 06:00 dawn      — warming up, golden additive rising.
 *  - 08:00–16:30 day — neutral (no tint).
 *  - 17:00–19:00 sunset — strong golden additive, ambient easing in.
 *  - 20:00 night     — blue ambient taking over.
 */
export function lightingForHour(hour: number): Lighting {
	// Normalise to 0..24.
	const h = ((hour % 24) + 24) % 24;

	// Ambient darkness: darkest at midnight, none at midday.
	const darkness = 1 - (Math.cos(((h - 12) / 24) * Math.PI * 2) + 1) / 2;

	// Ambient colour shifts from warm-grey dusk → deep blue at night.
	const nightBlue = 0x1a2450;
	const duskGrey = 0x3a3350;
	const ambientColor = mix(duskGrey, nightBlue, smoothRamp(darkness, 0.45, 0.95));

	// Ambient alpha: gentle, so night dims rather than blacks out. A ramp keeps
	// the whole bright band (≈08:30–16:30) completely clear; only the shoulders
	// and night pick up shade.
	const shade = smoothRamp(darkness, 0.1, 0.62);
	const ambientAlpha = Math.min(0.5, darkness * 0.52) * shade;

	// Warm golden light around sunrise (~6) and sunset (~18). A bell centred on
	// each, widened so it lingers gently.
	const dawnWarm = smoothRamp(h, 4.5, 6.5) * (1 - smoothRamp(h, 6.5, 8.5));
	const duskWarm = smoothRamp(h, 16.5, 18.5) * (1 - smoothRamp(h, 18.5, 20.5));
	const warmth = Math.max(dawnWarm, duskWarm);
	const warmColor = 0xffa94d;
	const warmAlpha = warmth * 0.34;

	return { ambientColor, ambientAlpha, warmColor, warmAlpha };
}
