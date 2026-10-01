/**
 * First-session onboarding (tutorial) — pure, engine-free state machine.
 *
 * A tiny ordered checklist that advances from real player signals so a brand new
 * player is guided through the first loop (move → gather → craft → build)
 * without a wall of text. Kept engine-agnostic so it is unit-testable and does
 * not couple gameplay code to Phaser/Svelte.
 */

export type TutorialSignal = 'move' | 'gather' | 'craft' | 'build' | 'talk';

export interface TutorialStep {
	id: string;
	/** Short imperative instruction shown in the overlay. */
	text: string;
	/** The signal that completes this step. */
	signal: TutorialSignal;
	/** Optional keyboard hint shown alongside the text. */
	hint?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
	{ id: 'move', text: 'Bergerak menjelajahi pantai', signal: 'move', hint: 'WASD' },
	{ id: 'gather', text: 'Kumpulkan kayu atau batu', signal: 'gather', hint: 'E' },
	{ id: 'craft', text: 'Buat alat pertamamu', signal: 'craft', hint: 'C' },
	{ id: 'build', text: 'Bangun api unggun', signal: 'build', hint: 'B' }
];

export class Tutorial {
	private index = 0;
	private done = false;

	/** Which step is currently active, or null when the tutorial is finished. */
	get active(): TutorialStep | null {
		return this.done ? null : (TUTORIAL_STEPS[this.index] ?? null);
	}

	get isComplete(): boolean {
		return this.done;
	}

	/** 0..1 progress across the checklist. */
	get progress(): number {
		return TUTORIAL_STEPS.length === 0 ? 1 : this.index / TUTORIAL_STEPS.length;
	}

	/**
	 * Feed a gameplay signal. Only the active step's signal advances the
	 * checklist (so signals can't skip ahead). Returns the step that was
	 * completed by this signal, or null. Finishing the last step marks it done.
	 */
	signal(s: TutorialSignal): TutorialStep | null {
		if (this.done) return null;
		const step = TUTORIAL_STEPS[this.index];
		if (!step || step.signal !== s) return null;
		this.index += 1;
		if (this.index >= TUTORIAL_STEPS.length) this.done = true;
		return step;
	}

	/** Skip/close the tutorial entirely (player dismissed it). */
	dismiss(): void {
		this.done = true;
		this.index = TUTORIAL_STEPS.length;
	}
}
