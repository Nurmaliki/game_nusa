<script lang="ts">
	import { resolve } from '$app/paths';
	import { settingsStore } from '$stores/settings.svelte';
	import { buildControlsReference } from '$game/input/controls-reference';

	const controls = buildControlsReference();

	function touchMode(): 'auto' | 'on' | 'off' {
		if (settingsStore.touchControls === null) return 'auto';
		return settingsStore.touchControls ? 'on' : 'off';
	}

	function parseTouchMode(value: string): boolean | null {
		if (value === 'on') return true;
		if (value === 'off') return false;
		return null;
	}
</script>

<svelte:head><title>Pengaturan — Nusantara Survival</title></svelte:head>

<main>
	<div class="panel">
		<h1>Pengaturan</h1>

		<section>
			<h2>Audio</h2>
			<label>
				<span>Master</span>
				<input type="range" min="0" max="1" step="0.05" bind:value={settingsStore.masterVolume} />
				<output>{Math.round(settingsStore.masterVolume * 100)}%</output>
			</label>
			<label>
				<span>Musik</span>
				<input type="range" min="0" max="1" step="0.05" bind:value={settingsStore.musicVolume} />
				<output>{Math.round(settingsStore.musicVolume * 100)}%</output>
			</label>
			<label>
				<span>SFX</span>
				<input type="range" min="0" max="1" step="0.05" bind:value={settingsStore.sfxVolume} />
				<output>{Math.round(settingsStore.sfxVolume * 100)}%</output>
			</label>
		</section>

		<section>
			<h2>Tampilan</h2>
			<label>
				<span>Skala UI</span>
				<input type="range" min="0.8" max="1.4" step="0.05" bind:value={settingsStore.uiScale} />
				<output>{Math.round(settingsStore.uiScale * 100)}%</output>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={settingsStore.reducedMotion} />
				<span>Kurangi gerakan (reduced motion)</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={settingsStore.screenShake} />
				<span>Getaran kamera</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={settingsStore.damageFlash} />
				<span>Efek kilat saat terluka</span>
			</label>
		</section>

		<section>
			<h2>Kontrol</h2>
			<label>
				<span>Tombol layar</span>
				<select
					value={touchMode()}
					onchange={(e) => (settingsStore.touchControls = parseTouchMode(e.currentTarget.value))}
				>
					<option value="auto">Otomatis (deteksi)</option>
					<option value="on">Selalu tampil</option>
					<option value="off">Sembunyikan</option>
				</select>
				<output></output>
			</label>
		</section>

		<section>
			<h2>Peta Tombol</h2>
			<ul class="keys">
				{#each controls as c (c.action + c.keys)}
					<li>
						<kbd>{c.keys}</kbd>
						<span>{c.label}</span>
					</li>
				{/each}
			</ul>
			<p class="hint">
				Di perangkat sentuh, gunakan tuas layar dan tombol di kanan bawah. Ketuk dua kali untuk
				menghindar.
			</p>
		</section>

		<a href={resolve('/')}>Kembali</a>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		color: var(--ink);
		font-family: var(--font-ui);
		padding: 24px;
	}
	.panel {
		max-width: 520px;
		width: 100%;
		padding: 26px 28px;
		border-radius: var(--radius-lg);
		background: linear-gradient(180deg, rgba(43, 63, 48, 0.96), rgba(30, 51, 40, 0.96));
		border: 3px solid var(--wood-dark);
		box-shadow:
			var(--shadow-panel),
			inset 0 0 0 3px rgba(247, 241, 227, 0.1);
	}
	h1 {
		margin-top: 0;
		font-family: var(--font-display);
		text-shadow: 0 3px 0 rgba(20, 12, 6, 0.4);
	}
	h2 {
		font-family: var(--font-display);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--amber);
		margin: 24px 0 12px;
		padding-bottom: 6px;
		border-bottom: 2px dashed rgba(247, 241, 227, 0.14);
	}
	label {
		display: grid;
		grid-template-columns: 100px 1fr 52px;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
		font-weight: 600;
	}
	label.check {
		grid-template-columns: auto 1fr;
		justify-content: start;
	}
	output {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--ink-soft);
	}
	select {
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-family: inherit;
		font-weight: 600;
	}
	input[type='range'] {
		width: 100%;
		accent-color: var(--green);
	}
	input[type='checkbox'] {
		width: 20px;
		height: 20px;
		accent-color: var(--green);
	}
	.keys {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.keys li {
		display: grid;
		grid-template-columns: 120px 1fr;
		align-items: center;
		gap: 10px;
	}
	kbd {
		font-family: var(--font-ui);
		font-size: 0.82rem;
		font-weight: 700;
		text-align: center;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		border: 2px solid var(--wood-dark);
		box-shadow: 0 2px 0 var(--wood-dark);
	}
	.hint {
		color: var(--ink-muted);
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 14px 0 0;
	}
	a {
		display: inline-block;
		margin-top: 26px;
		padding: 11px 22px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 4px 0 var(--wood-dark);
		transition:
			transform 0.08s ease,
			box-shadow 0.08s ease;
	}
	a:hover {
		filter: brightness(1.08);
	}
	a:active {
		transform: translateY(3px);
		box-shadow: 0 1px 0 var(--wood-dark);
	}
</style>
