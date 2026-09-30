import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioEngine } from './audio-engine';

/**
 * Lightweight fake of the Web Audio API surface the engine touches, so we can
 * assert volume routing / lifecycle in node without a real browser.
 */
class FakeParam {
	value = 0;
	setValueAtTime = vi.fn();
	linearRampToValueAtTime = vi.fn();
	exponentialRampToValueAtTime = vi.fn();
	setTargetAtTime = vi.fn();
}

class FakeNode {
	connect = vi.fn();
	disconnect = vi.fn();
}

class FakeGain extends FakeNode {
	gain = new FakeParam();
}

class FakeOscillator extends FakeNode {
	type = 'sine';
	frequency = new FakeParam();
	start = vi.fn();
	stop = vi.fn();
	onended: (() => void) | null = null;
}

class FakeBufferSource extends FakeNode {
	buffer: unknown = null;
	start = vi.fn();
	stop = vi.fn();
	onended: (() => void) | null = null;
}

class FakeFilter extends FakeNode {
	type = 'lowpass';
	frequency = new FakeParam();
}

class FakeAudioContext {
	state: 'running' | 'suspended' = 'suspended';
	currentTime = 0;
	sampleRate = 44100;
	destination = new FakeNode();
	createGain = vi.fn(() => new FakeGain());
	createOscillator = vi.fn(() => new FakeOscillator());
	createBufferSource = vi.fn(() => new FakeBufferSource());
	createBiquadFilter = vi.fn(() => new FakeFilter());
	createBuffer = vi.fn((_c: number, len: number) => ({
		getChannelData: () => new Float32Array(len)
	}));
	resume = vi.fn(async () => {
		this.state = 'running';
	});
	close = vi.fn(async () => {
		this.state = 'suspended';
	});
}

describe('AudioEngine', () => {
	let engine: AudioEngine;

	beforeEach(() => {
		engine = new AudioEngine();
		vi.stubGlobal('window', {
			AudioContext: FakeAudioContext,
			setInterval: vi.fn(() => 1),
			clearInterval: vi.fn()
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is not ready before unlock', () => {
		expect(engine.ready).toBe(false);
	});

	it('becomes ready after unlock', async () => {
		await engine.unlock();
		expect(engine.ready).toBe(true);
	});

	it('does not throw when playing before unlock', () => {
		expect(() => engine.play('ui_click')).not.toThrow();
	});

	it('plays a known sound after unlock and ignores unknown ids', async () => {
		await engine.unlock();
		expect(() => engine.play('ui_click')).not.toThrow();
		expect(() => engine.play('nope')).not.toThrow();
	});

	it('accepts volume changes without throwing', async () => {
		await engine.unlock();
		expect(() => engine.setVolumes(0.5, 0.4, 0.6)).not.toThrow();
		expect(() => engine.setMuted(true)).not.toThrow();
		expect(() => engine.setMuted(false)).not.toThrow();
	});

	it('can start and stop music, and dispose cleanly', async () => {
		await engine.unlock();
		engine.startMusic();
		engine.startMusic(); // idempotent
		engine.stopMusic();
		await engine.dispose();
		expect(engine.ready).toBe(false);
	});

	it('unlock is a no-op when Web Audio is unavailable', async () => {
		vi.stubGlobal('window', {});
		const e2 = new AudioEngine();
		await expect(e2.unlock()).resolves.toBeUndefined();
		expect(e2.ready).toBe(false);
	});
});
