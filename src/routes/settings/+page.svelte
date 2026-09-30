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
		background: radial-gradient(circle at 50% 30%, #10331f, #0b1220 70%);
		color: #f7fafc;
		font-family: system-ui, sans-serif;
		padding: 24px;
	}
	.panel {
		max-width: 480px;
		width: 100%;
	}
	h1 {
		margin-top: 0;
	}
	h2 {
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.7;
		margin: 20px 0 10px;
	}
	label {
		display: grid;
		grid-template-columns: 90px 1fr 48px;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	label.check {
		grid-template-columns: auto 1fr;
		justify-content: start;
	}
	output {
		text-align: right;
		font-variant-numeric: tabular-nums;
		opacity: 0.8;
	}
	select {
		padding: 6px 8px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
		font-family: inherit;
	}
	input[type='range'] {
		width: 100%;
	}
	.keys {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.keys li {
		display: grid;
		grid-template-columns: 110px 1fr;
		align-items: center;
		gap: 10px;
	}
	kbd {
		font-family: inherit;
		font-size: 0.82rem;
		text-align: center;
		padding: 3px 8px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
	}
	.hint {
		opacity: 0.65;
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 12px 0 0;
	}
	a {
		display: inline-block;
		margin-top: 24px;
		padding: 10px 18px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.08);
		color: inherit;
		text-decoration: none;
	}
</style>
