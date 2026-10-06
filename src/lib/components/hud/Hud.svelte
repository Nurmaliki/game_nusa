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
	let weatherName = $state('Cerah');

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
		const offWeather = bus.on('WEATHER_CHANGED', (p) => (weatherName = weatherLabel(p.weather)));
		return () => {
			offTime();
			offStats();
			offBiome();
			offWeather();
		};
	});

	// Weather display names (kept local so the HUD stays decoupled from the
	// weather system's internals; only the id crosses the bus boundary).
	function weatherLabel(id: string): string {
		switch (id) {
			case 'rain':
				return 'Hujan';
			case 'storm':
				return 'Badai';
			case 'fog':
				return 'Berkabut';
			case 'wind':
				return 'Berangin';
			default:
				return 'Cerah';
		}
	}

	const phaseLabel: Record<string, string> = {
		midnight: 'Tengah Malam',
		dawn: 'Fajar',
		sunrise: 'Matahari Terbit',
		morning: 'Pagi',
		midday: 'Siang',
		sunset: 'Senja',
		night: 'Malam'
	};

	const phaseIcon: Record<string, string> = {
		midnight: '🌙',
		dawn: '🌅',
		sunrise: '🌅',
		morning: '🌤️',
		midday: '☀️',
		sunset: '🌇',
		night: '🌙'
	};

	const weatherIcon: Record<string, string> = {
		Cerah: '☀️',
		Hujan: '🌧️',
		Badai: '⛈️',
		Berkabut: '🌫️',
		Berangin: '🍃'
	};

	const bars = $derived([
		{ icon: '❤️', label: 'Darah', value: stats.health, max: 100, color: 'var(--hp)' },
		{ icon: '🍗', label: 'Makan', value: stats.hunger, max: 100, color: 'var(--food)' },
		{ icon: '💧', label: 'Air', value: stats.thirst, max: 100, color: 'var(--water)' },
		{ icon: '⚡', label: 'Energi', value: stats.energy, max: 100, color: 'var(--energy)' }
	]);
</script>

<div class="hud">
	<div class="clock card">
		<div class="row">
			<span class="icon" aria-hidden="true">{phaseIcon[time.phase] ?? '🌤️'}</span>
			<span class="time">{time.clock}</span>
			<span class="day">Hari {time.day}</span>
		</div>
		<div class="chips">
			<span class="chip phase">{phaseLabel[time.phase] ?? time.phase}</span>
			<span class="chip biome">📍 {biomeName}</span>
			<span class="chip weather"
				>{weatherIcon[weatherName] ?? '☀️'}
				{weatherName}</span
			>
		</div>
	</div>

	<div class="stats card">
		{#each bars as bar (bar.label)}
			<div class="bar" title="{bar.label}: {Math.round(bar.value)}/{bar.max}">
				<span class="bar-icon" aria-hidden="true">{bar.icon}</span>
				<div class="bar-track">
					<div
						class="bar-fill"
						style="width: {Math.max(
							0,
							Math.min(100, (bar.value / bar.max) * 100)
						)}%; background: {bar.color}"
					></div>
				</div>
				<span class="bar-val">{Math.round(bar.value)}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.hud {
		position: absolute;
		inset: 0;
		pointer-events: none;
		color: var(--ink);
		font-family: var(--font-ui);
		padding: 12px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.card {
		background: linear-gradient(180deg, rgba(56, 81, 62, 0.92), rgba(43, 63, 48, 0.92));
		border: 2px solid var(--wood-dark);
		border-radius: var(--radius);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		padding: 8px 12px;
		backdrop-filter: blur(4px);
	}
	.clock {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.icon {
		font-size: 1.3rem;
		line-height: 1;
	}
	.time {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 2px 0 rgba(20, 12, 6, 0.45);
	}
	.day {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--amber);
		background: rgba(240, 178, 60, 0.16);
		border-radius: var(--radius-pill);
		padding: 2px 10px;
	}
	.chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.chip {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 3px 9px;
		border-radius: var(--radius-pill);
		background: rgba(20, 12, 6, 0.35);
		color: var(--ink-soft);
	}
	.chip.biome {
		color: var(--green-light);
	}
	.chip.weather {
		color: var(--sky);
	}
	.stats {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 200px;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.bar-icon {
		font-size: 0.85rem;
		width: 18px;
		text-align: center;
	}
	.bar-track {
		flex: 1;
		height: 12px;
		background: rgba(20, 12, 6, 0.55);
		border-radius: var(--radius-pill);
		overflow: hidden;
		box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.5);
	}
	.bar-fill {
		height: 100%;
		border-radius: var(--radius-pill);
		transition: width 0.25s ease;
		box-shadow: inset 0 2px 0 rgba(247, 241, 227, 0.35);
	}
	.bar-val {
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		width: 24px;
		text-align: right;
		color: var(--ink-soft);
	}
	@media (max-width: 560px) {
		.stats {
			width: 150px;
		}
		.chips {
			display: none;
		}
	}
</style>
