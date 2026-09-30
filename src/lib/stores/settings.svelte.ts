import { browser } from '$app/environment';

/**
 * Reactive settings store (Svelte 5 runes). Persisted to localStorage so it is
 * available before a save is loaded, and mirrored into saves on save.
 */
export interface Settings {
	masterVolume: number;
	musicVolume: number;
	sfxVolume: number;
	uiScale: number;
	reducedMotion: boolean;
	screenShake: boolean;
	damageFlash: boolean;
	/** Force on-screen touch controls on/off; null = auto-detect. */
	touchControls: boolean | null;
}

const STORAGE_KEY = 'nusantara.settings.v1';

const defaults: Settings = {
	masterVolume: 0.8,
	musicVolume: 0.5,
	sfxVolume: 0.8,
	uiScale: 1,
	reducedMotion: false,
	screenShake: true,
	damageFlash: true,
	touchControls: null
};

function load(): Settings {
	if (!browser) return { ...defaults };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...defaults };
		const parsed = JSON.parse(raw) as Partial<Settings>;
		return { ...defaults, ...parsed };
	} catch {
		return { ...defaults };
	}
}

class SettingsStore {
	masterVolume = $state(defaults.masterVolume);
	musicVolume = $state(defaults.musicVolume);
	sfxVolume = $state(defaults.sfxVolume);
	uiScale = $state(defaults.uiScale);
	reducedMotion = $state(defaults.reducedMotion);
	screenShake = $state(defaults.screenShake);
	damageFlash = $state(defaults.damageFlash);
	touchControls = $state<boolean | null>(defaults.touchControls);

	private persistDebounced = 0;

	/** Call once after mount to hydrate from storage. */
	init(): void {
		const s = load();
		this.masterVolume = s.masterVolume;
		this.musicVolume = s.musicVolume;
		this.sfxVolume = s.sfxVolume;
		this.uiScale = s.uiScale;
		this.reducedMotion = s.reducedMotion;
		this.screenShake = s.screenShake;
		this.damageFlash = s.damageFlash;
		this.touchControls = s.touchControls;

		// Auto-persist on any change.
		$effect.root(() => {
			$effect(() => {
				// Touch every field to subscribe.
				void this.masterVolume;
				void this.musicVolume;
				void this.sfxVolume;
				void this.uiScale;
				void this.reducedMotion;
				void this.screenShake;
				void this.damageFlash;
				void this.touchControls;
				this.schedulePersist();
			});
		});
	}

	private schedulePersist(): void {
		if (!browser) return;
		clearTimeout(this.persistDebounced);
		this.persistDebounced = window.setTimeout(() => this.persist(), 200);
	}

	persist(): void {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
		} catch (e) {
			console.warn('[settings] failed to persist', e);
		}
	}

	snapshot(): Settings {
		return {
			masterVolume: this.masterVolume,
			musicVolume: this.musicVolume,
			sfxVolume: this.sfxVolume,
			uiScale: this.uiScale,
			reducedMotion: this.reducedMotion,
			screenShake: this.screenShake,
			damageFlash: this.damageFlash,
			touchControls: this.touchControls
		};
	}

	apply(s: Partial<Settings>): void {
		Object.assign(this, s);
	}
}

export const settingsStore = new SettingsStore();
