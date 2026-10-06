<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { settingsStore } from '$stores/settings.svelte';
	import { TUTORIAL_STEPS, Tutorial } from '$game/systems/tutorial';

	/**
	 * First-session onboarding. Shows an ordered checklist that advances from
	 * gameplay signals (TUTORIAL_SIGNAL). Hidden once finished/dismissed and
	 * remembered across sessions via settingsStore.tutorialSeen.
	 */
	const tutorial = new Tutorial();

	// Visibility follows the persisted preference (so a late settings hydration
	// after reload cannot re-show a previously dismissed guide).
	let localOpen = $state(true);
	let active = $state(tutorial.active);
	let stepIndex = $state(0);
	let justCompleted = $state<string | null>(null);

	const visible = $derived(!settingsStore.tutorialSeen && localOpen);

	function refresh(): void {
		active = tutorial.active;
		stepIndex = TUTORIAL_STEPS.findIndex((s) => s.id === active?.id);
		if (stepIndex < 0) stepIndex = TUTORIAL_STEPS.length; // complete
	}

	function finish(): void {
		settingsStore.tutorialSeen = true;
		settingsStore.persist();
		localOpen = false;
	}

	$effect(() => {
		const bus = getGameBus();
		const off = bus.on('TUTORIAL_SIGNAL', (p) => {
			const done = tutorial.signal(p.signal);
			if (done) {
				justCompleted = done.text;
				if (tutorial.isComplete) {
					settingsStore.tutorialSeen = true;
					settingsStore.persist();
					// Let the final checkmark show briefly before hiding.
					setTimeout(() => (localOpen = false), 1400);
				}
			}
			refresh();
		});
		return off;
	});
</script>

{#if visible}
	<div class="tutorial" role="status" aria-live="polite" aria-label="Panduan">
		<div class="card">
			<div class="head">
				<span class="title">Panduan Awal</span>
				<button class="skip" onclick={finish} aria-label="Lewati panduan">Lewati</button>
			</div>

			{#if active}
				<div class="step">
					<div class="marker">{tutorial.progress < 1 ? '▶' : '✓'}</div>
					<div class="text">
						{active.text}
						{#if active.hint}<span class="hint">[{active.hint}]</span>{/if}
					</div>
				</div>
			{:else}
				<div class="step done">
					<div class="marker">✓</div>
					<div class="text">Siap menjelajah! Semoga beruntung.</div>
				</div>
			{/if}

			<ul class="dots" aria-hidden="true">
				{#each TUTORIAL_STEPS as s, i (s.id)}
					<li class:done={i < stepIndex}></li>
				{/each}
			</ul>

			{#if justCompleted && !tutorial.isComplete}
				<span class="flash">✓ {justCompleted}</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.tutorial {
		position: absolute;
		top: 78px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 45;
		pointer-events: none;
		font-family: var(--font-ui);
	}
	.card {
		background: linear-gradient(180deg, var(--panel-raised), var(--panel));
		border: 2px solid var(--wood-dark);
		border-radius: var(--radius);
		padding: 12px 16px;
		min-width: 280px;
		max-width: min(440px, 90vw);
		color: var(--ink);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		pointer-events: auto;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 6px;
	}
	.title {
		font-family: var(--font-display);
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--amber);
	}
	.skip {
		background: transparent;
		border: none;
		color: var(--sky);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}
	.step {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.95rem;
	}
	.marker {
		color: var(--green-light);
		font-weight: 800;
	}
	.hint {
		margin-left: 6px;
		font-size: 0.78rem;
		color: var(--ink-muted);
	}
	.dots {
		list-style: none;
		display: flex;
		gap: 6px;
		margin: 12px 0 0;
		padding: 0;
	}
	.dots li {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: rgba(20, 12, 6, 0.5);
	}
	.dots li.done {
		background: var(--green);
		box-shadow: 0 0 0 2px rgba(107, 191, 90, 0.3);
	}
	.flash {
		display: block;
		margin-top: 8px;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--green-light);
	}
</style>
