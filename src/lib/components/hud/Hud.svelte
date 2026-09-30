<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import type { TimePayload } from '$types/events';
	import { BALANCE } from '$game/config/balance';

	let time = $state<TimePayload>({
		fraction: 0.25,
		day: 1,
		phase: 'dawn',
		clock: '06:00'
	});

	let biomeName = $state('Pesisir Tropis');

	// Placeholder stat bars until survival system lands in Phase 2.
	let stats = $state<{ health: number; hunger: number; thirst: number; energy: number }>({
		health: BALANCE.player.startingHealth,
		hunger: BALANCE.player.startingHunger,
		thirst: BALANCE.player.startingThirst,
		energy: BALANCE.player.startingEnergy
	});

	$effect(() => {
		const bus = getGameBus();
		const offTime = bus.on('TIME_CHANGED', (p) => (time = p));
		const offStats = bus.on('PLAYER_STATS_CHANGED', (p) => {
			stats = {
				health: p.health,
				hunger: p.hunger,
				thirst: p.thirst,
				energy: p.energy
			};
		});
		const offBiome = bus.on('BIOME_CHANGED', (p) => (biomeName = p.name));
		return () => {
			offTime();
			offStats();
			offBiome();
		};
	});

	const bars = $derived([
		{ label: 'HP', value: stats.health, max: 100, color: '#e53e3e' },
		{ label: 'Food', value: stats.hunger, max: 100, color: '#dd6b20' },
		{ label: 'Water', value: stats.thirst, max: 100, color: '#3182ce' },
		{ label: 'Energy', value: stats.energy, max: 100, color: '#38a169' }
	]);
</script>

<div class="hud">
	<div class="clock">
		<span class="day">Day {time.day}</span>
		<span class="time">{time.clock}</span>
		<span class="phase">{time.phase}</span>
		<span class="biome">{biomeName}</span>
	</div>

	<div class="stats">
		{#each bars as bar (bar.label)}
			<div class="bar" title="{bar.label}: {Math.round(bar.value)}/{bar.max}">
				<span class="bar-label">{bar.label}</span>
				<div class="bar-track">
					<div
						class="bar-fill"
						style="width: {Math.max(
							0,
							Math.min(100, (bar.value / bar.max) * 100)
						)}%; background: {bar.color}"
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.hud {
		position: absolute;
		inset: 0;
		pointer-events: none;
		color: #f7fafc;
		font-family: system-ui, sans-serif;
		padding: 12px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.clock {
		background: rgba(11, 18, 32, 0.65);
		border-radius: 8px;
		padding: 8px 12px;
		display: flex;
		gap: 10px;
		align-items: baseline;
		font-variant-numeric: tabular-nums;
	}
	.day {
		font-weight: 700;
	}
	.time {
		font-size: 1.25rem;
		font-weight: 700;
	}
	.phase {
		text-transform: capitalize;
		opacity: 0.8;
		font-size: 0.85rem;
	}
	.biome {
		font-size: 0.8rem;
		padding-left: 10px;
		margin-left: 4px;
		border-left: 1px solid rgba(255, 255, 255, 0.2);
		color: #68d391;
	}
	.stats {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 180px;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.bar-label {
		font-size: 0.7rem;
		width: 42px;
		opacity: 0.9;
	}
	.bar-track {
		flex: 1;
		height: 10px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 5px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 5px;
		transition: width 0.2s ease;
	}
</style>
