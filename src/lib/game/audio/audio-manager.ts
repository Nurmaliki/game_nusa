import { getGameBus } from '../core/event-bus';
import { log } from '../core/logger';
import { AudioEngine } from './audio-engine';
import { EVENT_SFX, sfxForCombatHit, sfxForToast } from './audio-map';

/**
 * Audio manager (see §45): wires the game event bus to the procedural
 * AudioEngine, and holds the single engine instance. UI calls `unlock()` from a
 * user gesture and pushes volumes from the settings store.
 */
class AudioManager {
	readonly engine = new AudioEngine();
	private disposers: (() => void)[] = [];
	private started = false;

	/** Attach the event listeners (idempotent). */
	init(): void {
		if (this.started) return;
		this.started = true;
		const bus = getGameBus();

		for (const [event, sfxId] of Object.entries(EVENT_SFX)) {
			if (!sfxId) continue;
			const dispose = bus.on(event as never, () => this.engine.play(sfxId));
			this.disposers.push(dispose);
		}

		this.disposers.push(
			bus.on('COMBAT_HIT', (p) => this.engine.play(sfxForCombatHit(p))),
			bus.on('TOAST', (p) => this.engine.play(sfxForToast(p.kind))),
			bus.on('SFX', (p) => this.engine.play(p.id))
		);
	}

	/** Unlock + start ambient music. Call from a user gesture (play mount). */
	async start(): Promise<void> {
		this.init();
		await this.engine.unlock();
		this.engine.startMusic();
		if (this.engine.ready) log.info('GAME', 'Audio engine unlocked');
	}

	stop(): void {
		this.engine.stopMusic();
	}

	async shutdown(): Promise<void> {
		this.stop();
		for (const d of this.disposers) d();
		this.disposers = [];
		this.started = false;
		await this.engine.dispose();
	}

	/** Convenience pass-through so callers can trigger UI sounds directly. */
	play(id: string): void {
		this.engine.play(id);
	}
}

let manager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
	if (!manager) manager = new AudioManager();
	return manager;
}
