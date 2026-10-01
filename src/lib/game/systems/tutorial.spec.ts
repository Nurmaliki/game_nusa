import { describe, expect, it } from 'vitest';
import { TUTORIAL_STEPS, Tutorial } from './tutorial';

describe('Tutorial', () => {
	it('starts on the first step', () => {
		expect(new Tutorial().active?.signal).toBe('move');
	});

	it('advances only on the active step signal', () => {
		const t = new Tutorial();
		// Out-of-order signals are ignored (can't skip ahead).
		expect(t.signal('craft')).toBeNull();
		expect(t.active?.signal).toBe('move');
		expect(t.signal('move')?.id).toBe('move');
		expect(t.active?.signal).toBe('gather');
	});

	it('walks the full checklist and then completes', () => {
		const t = new Tutorial();
		for (const step of TUTORIAL_STEPS) {
			expect(t.signal(step.signal)?.id).toBe(step.id);
		}
		expect(t.isComplete).toBe(true);
		expect(t.active).toBeNull();
	});

	it('is a no-op once complete', () => {
		const t = new Tutorial();
		for (const step of TUTORIAL_STEPS) t.signal(step.signal);
		expect(t.signal('move')).toBeNull();
	});

	it('dismiss finishes immediately with full progress', () => {
		const t = new Tutorial();
		t.dismiss();
		expect(t.isComplete).toBe(true);
		expect(t.progress).toBe(1);
	});

	it('progress increases monotonically with steps done', () => {
		const t = new Tutorial();
		const p0 = t.progress;
		t.signal('move');
		const p1 = t.progress;
		expect(p1).toBeGreaterThan(p0);
	});

	it('every step has a unique id and non-empty text', () => {
		const ids = new Set(TUTORIAL_STEPS.map((s) => s.id));
		expect(ids.size).toBe(TUTORIAL_STEPS.length);
		for (const s of TUTORIAL_STEPS) expect(s.text.length).toBeGreaterThan(0);
	});
});
