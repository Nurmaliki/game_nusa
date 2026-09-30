import { BALANCE } from '../config/balance';
import { getSfx, type SfxDefinition } from './sfx';

/**
 * Procedural audio engine (see §24 / §45).
 *
 * All sounds are synthesised at runtime with the Web Audio API — no asset files.
 * The engine is lazy: the AudioContext is created on the first user gesture to
 * comply with browser autoplay policies. Volume comes from the settings store
 * via {@link setVolumes}.
 *
 * This module is presentation-only and never imported by the pure game core.
 */
export class AudioEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private sfxGain: GainNode | null = null;
	private musicGain: GainNode | null = null;
	private noiseBuffer: AudioBuffer | null = null;
	private activeVoices = 0;
	private musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
	private musicTimer: number | null = null;

	private masterVolume = 0.8;
	private musicVolume = 0.5;
	private sfxVolume = 0.8;
	private muted = false;

	/** True once the context exists and is running. */
	get ready(): boolean {
		return this.ctx !== null && this.ctx.state === 'running';
	}

	/** Create/resume the audio context. Must be called from a user gesture. */
	async unlock(): Promise<void> {
		if (typeof window === 'undefined') return;
		if (!this.ctx) {
			const Ctor =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!Ctor) return;
			this.ctx = new Ctor();
			this.masterGain = this.ctx.createGain();
			this.sfxGain = this.ctx.createGain();
			this.musicGain = this.ctx.createGain();
			this.sfxGain.connect(this.masterGain);
			this.musicGain.connect(this.masterGain);
			this.masterGain.connect(this.ctx.destination);
			this.noiseBuffer = this.buildNoiseBuffer(this.ctx);
			this.applyGains();
		}
		if (this.ctx.state === 'suspended') {
			try {
				await this.ctx.resume();
			} catch {
				/* ignore — will retry on the next gesture */
			}
		}
	}

	setVolumes(master: number, music: number, sfx: number): void {
		this.masterVolume = master;
		this.musicVolume = music;
		this.sfxVolume = sfx;
		this.applyGains();
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		this.applyGains();
	}

	private applyGains(): void {
		if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
		const now = this.ctx.currentTime;
		const master = this.muted ? 0 : this.masterVolume * BALANCE.audio.masterCeiling;
		this.masterGain.gain.setTargetAtTime(master, now, 0.02);
		this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.02);
		this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.6, now, 0.1);
	}

	private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
		const len = Math.floor(ctx.sampleRate * 0.5);
		const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
		return buffer;
	}

	/** Play a one-shot sound by id. Safe to call before unlock (no-op). */
	play(id: string): void {
		const def = getSfx(id);
		if (!def || !this.ctx || !this.sfxGain) return;
		if (this.activeVoices >= BALANCE.audio.maxVoices) return;
		this.activeVoices++;
		try {
			this.scheduleVoice(def);
		} finally {
			// Approximate: voices are short; release the slot after the tail.
			setTimeout(
				() => {
					this.activeVoices = Math.max(0, this.activeVoices - 1);
				},
				def.duration * 1000 + 40
			);
		}
	}

	private scheduleVoice(def: SfxDefinition): void {
		const ctx = this.ctx!;
		const now = ctx.currentTime;
		const gain = ctx.createGain();
		const peak = Math.max(0.0001, def.gain);
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.linearRampToValueAtTime(peak, now + def.attack);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + def.duration);

		let source: AudioScheduledSourceNode;
		if (def.wave === 'noise') {
			const src = ctx.createBufferSource();
			src.buffer = this.noiseBuffer;
			source = src;
		} else {
			const osc = ctx.createOscillator();
			osc.type = def.wave;
			osc.frequency.setValueAtTime(def.startHz, now);
			if (def.endHz && def.endHz !== def.startHz) {
				osc.frequency.linearRampToValueAtTime(def.endHz, now + def.duration);
			}
			source = osc;
		}

		let tail: AudioNode = source;
		if (def.lowpassHz) {
			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = def.lowpassHz;
			source.connect(filter);
			tail = filter;
		}
		tail.connect(gain);
		gain.connect(this.sfxGain!);

		source.start(now);
		source.stop(now + def.duration + 0.02);
		source.onended = () => {
			gain.disconnect();
		};
	}

	/**
	 * Start a simple procedural ambient pad. Idempotent; a slow oscillator drift
	 * gives the soundtrack a living, non-looping feel without any audio file.
	 */
	startMusic(): void {
		if (!this.ctx || !this.musicGain || this.musicTimer !== null) return;
		const ctx = this.ctx;
		// A soft minor-ish triad that slowly detunes.
		const freqs = [110, 164.81, 220];
		for (const f of freqs) {
			const osc = ctx.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = f;
			const gain = ctx.createGain();
			gain.gain.value = 0.0001;
			osc.connect(gain);
			gain.connect(this.musicGain);
			osc.start();
			this.musicNodes.push({ osc, gain });
		}
		// Gentle tremolo / drift.
		let t = 0;
		this.musicTimer = window.setInterval(() => {
			if (!this.ctx || !this.musicGain) return;
			t += 0.1;
			const target = 0.02 + 0.015 * (1 + Math.sin(t));
			const now = this.ctx.currentTime;
			for (const { osc, gain } of this.musicNodes) {
				gain.gain.setTargetAtTime(target, now, 0.5);
				osc.frequency.setTargetAtTime(osc.frequency.value * 1.0002, now, 1);
			}
		}, 100);
	}

	stopMusic(): void {
		if (this.musicTimer !== null) {
			clearInterval(this.musicTimer);
			this.musicTimer = null;
		}
		for (const { osc, gain } of this.musicNodes) {
			try {
				osc.stop();
			} catch {
				/* already stopped */
			}
			osc.disconnect();
			gain.disconnect();
		}
		this.musicNodes = [];
	}

	/** Full teardown (e.g. leaving play). */
	async dispose(): Promise<void> {
		this.stopMusic();
		if (this.ctx) {
			try {
				await this.ctx.close();
			} catch {
				/* ignore */
			}
		}
		this.ctx = null;
		this.masterGain = null;
		this.sfxGain = null;
		this.musicGain = null;
		this.noiseBuffer = null;
		this.activeVoices = 0;
	}
}
