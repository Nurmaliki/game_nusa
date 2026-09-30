/**
 * Generates the PWA icon set into static/icons/.
 *
 * Zero third-party assets: every pixel is drawn here programmatically and the
 * PNG bytes are assembled with Node's built-in zlib — no image libraries.
 * Run with `node scripts/generate-icons.mjs` (outputs are committed).
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../static/icons');

/** CRC32 for PNG chunks. */
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const typeBuf = Buffer.from(type, 'ascii');
	const lenBuf = Buffer.alloc(4);
	lenBuf.writeUInt32BE(data.length, 0);
	const crcBuf = Buffer.alloc(4);
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Encode an RGBA pixel buffer (width*height*4) to PNG bytes. */
function encodePng(width, height, rgba) {
	const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // colour type RGBA
	// 10..12 = compression, filter, interlace = 0

	// Prepend a filter byte (0 = none) to each scanline.
	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}
	const idat = deflateSync(raw, { level: 9 });
	return Buffer.concat([
		sig,
		chunk('IHDR', ihdr),
		chunk('IDAT', idat),
		chunk('IEND', Buffer.alloc(0))
	]);
}

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Draw the "Nusantara" mark: a deep-sea radial gradient, a rising sun disc and
 * a stylised island silhouette. All shapes are computed per-pixel with smooth
 * anti-aliased edges (distance-based alpha).
 */
function drawIcon(size, { maskable = false } = {}) {
	const rgba = Buffer.alloc(size * size * 4);
	const cx = size / 2;
	const cover = maskable ? 0.62 : 0.92; // safe area for maskable icons
	const r = (size / 2) * cover;

	const setPx = (x, y, r0, g0, b0, a) => {
		if (a <= 0) return;
		const i = (y * size + x) * 4;
		const inv = 1 - a;
		rgba[i] = Math.round(rgba[i] * inv + r0 * a);
		rgba[i + 1] = Math.round(rgba[i + 1] * inv + g0 * a);
		rgba[i + 2] = Math.round(rgba[i + 2] * inv + b0 * a);
		rgba[i + 3] = Math.min(255, rgba[i + 3] + Math.round(255 * a));
	};

	const smooth = (edge, d) => {
		const w = Math.max(1.2, edge);
		const t = (d - (w - 0.5)) / w;
		return Math.max(0, Math.min(1, 1 - t));
	};

	// Sky-to-sea background gradient.
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const t = y / (size - 1);
			const r0 = Math.round(lerp(16, 11, t));
			const g0 = Math.round(lerp(63, 18, t));
			const b0 = Math.round(lerp(45, 32, t));
			setPx(x, y, r0, g0, b0, 1);
		}
	}

	// Rising sun (warm disc) behind the island, upper-middle.
	const sunCx = cx;
	const sunCy = size * 0.4;
	const sunR = r * 0.42;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const d = Math.hypot(x - sunCx, y - sunCy);
			if (d < sunR + 2) {
				const a = smooth(2, d - sunR);
				const t = d / sunR;
				const r0 = Math.round(lerp(255, 246, t));
				const g0 = Math.round(lerp(214, 130, t));
				const b0 = Math.round(lerp(120, 60, t));
				setPx(x, y, r0, g0, b0, a * 0.95);
			}
		}
	}

	// Island silhouette: a wide, flat-topped hill with a smaller twin peak.
	const baseY = size * 0.66;
	const islandColor = [26, 46, 33];
	for (let x = 0; x < size; x++) {
		const nx = (x - cx) / r;
		// Two gaussian bumps.
		const h1 = Math.exp(-Math.pow((nx + 0.18) * 2.6, 2));
		const h2 = 0.7 * Math.exp(-Math.pow((nx - 0.28) * 3.2, 2));
		const topY = baseY - r * (0.34 * h1 + 0.26 * h2) - size * 0.02;
		for (let y = Math.floor(topY); y < size; y++) {
			const a = smooth(1.5, Math.max(0, y - topY) < 1.5 ? Math.abs(y - topY) : -1);
			setPx(x, y, islandColor[0], islandColor[1], islandColor[2], y >= topY ? 1 : a);
		}
	}

	// Sea line in front of the island.
	const seaY = size * 0.78;
	for (let y = Math.floor(seaY); y < size; y++) {
		for (let x = 0; x < size; x++) {
			const a = smooth(1.5, y - seaY) * 0.85;
			setPx(x, y, 15, 40, 60, a);
		}
	}

	// Rounded-square mask for non-maskable icons.
	if (!maskable) {
		const radius = size * 0.22;
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const dx = Math.max(radius - x, x - (size - 1 - radius), 0);
				const dy = Math.max(radius - y, y - (size - 1 - radius), 0);
				const d = Math.hypot(dx, dy);
				if (d > radius - 1) {
					const i = (y * size + x) * 4;
					const a = Math.max(0, Math.min(1, 1 - (d - (radius - 1.5))));
					rgba[i + 3] = Math.round(rgba[i + 3] * a);
				}
			}
		}
	}

	return encodePng(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
const targets = [
	{ file: 'icon-192.png', size: 192, maskable: false },
	{ file: 'icon-512.png', size: 512, maskable: false },
	{ file: 'icon-maskable-512.png', size: 512, maskable: true },
	{ file: 'apple-touch-icon-180.png', size: 180, maskable: false },
	{ file: 'favicon-32.png', size: 32, maskable: false }
];

for (const t of targets) {
	const png = drawIcon(t.size, { maskable: t.maskable });
	writeFileSync(resolve(OUT_DIR, t.file), png);
	console.log(`wrote ${t.file} (${png.length} bytes)`);
}
