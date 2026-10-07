<script lang="ts">
	import { onMount } from 'svelte';
	import GameCanvas from '$lib/components/game/GameCanvas.svelte';
	import Hud from '$lib/components/hud/Hud.svelte';
	import Hotbar from '$lib/components/hud/Hotbar.svelte';
	import DeathOverlay from '$lib/components/hud/DeathOverlay.svelte';
	import DamageFlash from '$lib/components/hud/DamageFlash.svelte';
	import DialoguePanel from '$lib/components/hud/DialoguePanel.svelte';
	import QuestTracker from '$lib/components/hud/QuestTracker.svelte';
	import ChapterCompleteOverlay from '$lib/components/hud/ChapterCompleteOverlay.svelte';
	import MobileControls from '$lib/components/hud/MobileControls.svelte';
	import RotateHint from '$lib/components/hud/RotateHint.svelte';
	import Minimap from '$lib/components/hud/Minimap.svelte';
	import MapPanel from '$lib/components/hud/MapPanel.svelte';
	import InteractionPrompt from '$lib/components/hud/InteractionPrompt.svelte';
	import InventoryPanel from '$lib/components/inventory/InventoryPanel.svelte';
	import CraftingPanel from '$lib/components/crafting/CraftingPanel.svelte';
	import BuildingPanel from '$lib/components/building/BuildingPanel.svelte';
	import QuestLogPanel from '$lib/components/quests/QuestLogPanel.svelte';
	import SkillsPanel from '$lib/components/hud/SkillsPanel.svelte';
	import AchievementsPanel from '$lib/components/hud/AchievementsPanel.svelte';
	import TutorialOverlay from '$lib/components/hud/TutorialOverlay.svelte';
	import { getGameBus } from '$game/core/event-bus';
	import { BALANCE } from '$game/config/balance';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getItem } from '$data/items';
	import { getQuest } from '$data/quests';
	import { deviceStore, shouldShowTouchControls } from '$stores/device.svelte';
	import { settingsStore } from '$stores/settings.svelte';
	import { getAudioManager } from '$game/audio/audio-manager';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let inventoryOpen = $state(false);
	let craftingOpen = $state(false);
	let buildingOpen = $state(false);
	let questsOpen = $state(false);
	let skillsOpen = $state(false);
	let achievementsOpen = $state(false);
	let mapOpen = $state(false);
	let toast = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);
	let muted = $state(false);
	const session = getGameSession();

	// Touch controls: explicit setting wins, else auto-detect on touch devices.
	const showTouch = $derived(
		shouldShowTouchControls(settingsStore.touchControls, deviceStore.isTouch)
	);
	// Any open panel suspends on-screen movement so the player doesn't drift.
	const anyPanelOpen = $derived(
		inventoryOpen ||
			craftingOpen ||
			buildingOpen ||
			questsOpen ||
			skillsOpen ||
			achievementsOpen ||
			mapOpen
	);

	onMount(() => {
		deviceStore.init();
		if (!session.hasActive()) session.newGame();

		// Audio: unlock on this (gesture-initiated) mount and push current volumes.
		const audio = getAudioManager();
		void audio.start();
		const pushVolume = () => {
			audio.engine.setVolumes(
				settingsStore.masterVolume,
				settingsStore.musicVolume,
				settingsStore.sfxVolume
			);
		};
		pushVolume();

		// Re-push volumes whenever the settings change.
		const stopVolumeEffect = $effect.root(() => {
			$effect(() => {
				void settingsStore.masterVolume;
				void settingsStore.musicVolume;
				void settingsStore.sfxVolume;
				pushVolume();
			});
		});

		const stopAudio = () => {
			stopVolumeEffect();
			void audio.shutdown();
		};
		const onVisibility = () => {
			// Free the audio context while backgrounded.
			if (document.hidden) audio.engine.setMuted(true);
			else audio.engine.setMuted(false);
		};
		document.addEventListener('visibilitychange', onVisibility);
		// Test-only seam: expose a minimal, opt-in gameplay driver when the
		// page is opened with ?e2e=1. Never active during normal play.
		if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('e2e')) {
			(window as unknown as { __gameE2E?: unknown }).__gameE2E = {
				acceptQuest: (id: string) => session.state?.acceptQuest(id),
				turnInQuest: (id: string) => {
					const r = session.state?.turnInQuest(id);
					if (r?.ok) {
						session.notifyInventory();
						session.emitStats();
						getGameBus().emit('QUEST_UPDATED_UI', { revision: Date.now() });
						if (r.value.final) {
							const chapter = getQuest(id)?.chapter ?? 1;
							getGameBus().emit('CHAPTER_COMPLETE', {
								chapter,
								title: chapter === 2 ? 'Pusaka Kawah' : 'Kapal Layar'
							});
						}
					}
					return r;
				},
				grant: (id: string, qty: number) => {
					const state = session.state;
					if (!state) return;
					const def = getItem(id);
					if (def) state.inventory.add({ id, qty }, def);
					session.notifyInventory();
				},
				place: (buildingId: string) => {
					const state = session.state;
					if (!state) return;
					const r = state.addBuilding(buildingId, { ...state.player.position }, []);
					// The test driver places finished structures (the player has
					// "already built" them). If a construction-time feature is
					// present, finish it immediately so a station is usable in the
					// same evaluate() batch; otherwise buildings are instant already.
					if (r.ok) {
						(state as { advanceConstruction?: (ms: number) => unknown }).advanceConstruction?.(
							Number.MAX_SAFE_INTEGER
						);
					}
				},
				craft: (recipeId: string) => session.state?.craftAt(recipeId),
				talk: (npcId: string) => {
					const state = session.state;
					if (!state) return;
					state.talkToNpc(npcId, 'root');
				},
				defeat: (creatureId: string, count: number) => {
					const state = session.state;
					if (!state) return;
					for (let i = 0; i < count; i++) {
						state.grantLoot([], () => 0.5, creatureId);
					}
				},
				completeChapter: (chapter = 1) => {
					const state = session.state;
					if (!state) return;
					// Drive the final quest straight to COMPLETED for the E2E
					// assertion path; uses the same public quest API.
					state.chapterComplete = true;
					getGameBus().emit('CHAPTER_COMPLETE', {
						chapter,
						title: chapter === 2 ? 'Pusaka Kawah' : 'Kapal Layar'
					});
				},
				harvest: (nodeId: string, instanceId: string) => session.state?.harvest(nodeId, instanceId),
				count: (itemId: string) => session.state?.inventory.count(itemId) ?? 0,
				save: () => session.saveNow(),
				buildings: () => session.state?.buildings.length ?? 0,
				achievements: () => session.state?.achievements.serialize() ?? [],
				evaluateAchievements: () => session.state?.evaluateAchievements() ?? [],
				stats: () => {
					const s = session.state?.stats;
					return s
						? { health: s.health, hunger: s.hunger, thirst: s.thirst, energy: s.energy }
						: null;
				},
				// Test helper: fast-forward the in-game clock to a target hour (0..24)
				// so day/night lighting can be asserted without waiting real minutes.
				setHour: (hour: number) => {
					const state = session.state;
					if (!state) return;
					const msPerDay = BALANCE.dayNight.msPerGameDay;
					const cur = state.clock.dayFraction * msPerDay;
					const target = (hour / 24) * msPerDay;
					let delta = target - cur;
					if (delta < 0) delta += msPerDay;
					state.clock.advance(delta);
				}
			};
		}

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			stopAudio();
		};
	});

	$effect(() => {
		const bus = getGameBus();
		const offToast = bus.on('TOAST', (p) => {
			toast = p.text;
			setTimeout(() => (toast = null), 2200);
		});
		const offErr = bus.on('GAME_ERROR', (p) => (errorMsg = p.message));
		return () => {
			offToast();
			offErr();
		};
	});

	function onKey(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
		if (e.key === 'i' || e.key === 'I') {
			inventoryOpen = !inventoryOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'c' || e.key === 'C') {
			craftingOpen = !craftingOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'b' || e.key === 'B') {
			buildingOpen = !buildingOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'j' || e.key === 'J') {
			questsOpen = !questsOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'k' || e.key === 'K') {
			skillsOpen = !skillsOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'p' || e.key === 'P') {
			achievementsOpen = !achievementsOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'm' || e.key === 'M') {
			mapOpen = !mapOpen;
			playUiClick();
			e.preventDefault();
		} else if (e.key === 'Escape') {
			inventoryOpen = false;
			craftingOpen = false;
			buildingOpen = false;
			questsOpen = false;
			skillsOpen = false;
			achievementsOpen = false;
			mapOpen = false;
			e.preventDefault();
		}
	}

	function playUiClick(): void {
		getGameBus().emit('SFX', { id: 'ui_click' });
	}

	function toggleMute(): void {
		muted = !muted;
		getAudioManager().engine.setMuted(muted);
	}

	async function saveNow() {
		const r = await session.saveNow();
		getGameBus().emit('TOAST', {
			text: r.ok ? 'Progres disimpan' : 'Gagal menyimpan',
			kind: r.ok ? 'success' : 'warning'
		});
	}

	function quitToMenu() {
		void session.saveNow();
		goto(resolve('/'));
	}
</script>

<svelte:head><title>Play — Nusantara Survival</title></svelte:head>

<svelte:window onkeydown={onKey} />

<div class="play" class:touch={showTouch}>
	<GameCanvas />
	<Hud />
	<Minimap corner={showTouch ? 'tr' : 'bl'} />
	<Hotbar />
	<DeathOverlay />
	<DamageFlash />
	<InteractionPrompt />
	<QuestTracker />
	<DialoguePanel />
	<ChapterCompleteOverlay />
	<TutorialOverlay />
	{#if showTouch}
		<MobileControls disabled={anyPanelOpen} />
	{/if}
	<RotateHint />

	<div class="topbar">
		<button onclick={toggleMute} aria-label={muted ? 'Nyalakan suara' : 'Bisukan suara'}>
			{muted ? '🔇' : '🔊'}
		</button>
		<button onclick={saveNow}>Simpan</button>
		<button onclick={quitToMenu}>Keluar</button>
	</div>

	<div class="controls">
		<button
			class:active={inventoryOpen}
			onclick={() => {
				inventoryOpen = !inventoryOpen;
				playUiClick();
			}}
			aria-keyshortcuts="i"
		>
			I · Tas
		</button>
		<button
			class:active={craftingOpen}
			onclick={() => {
				craftingOpen = !craftingOpen;
				playUiClick();
			}}
			aria-keyshortcuts="c"
		>
			C · Kerajinan
		</button>
		<button
			class:active={buildingOpen}
			onclick={() => {
				buildingOpen = !buildingOpen;
				playUiClick();
			}}
			aria-keyshortcuts="b"
		>
			B · Bangun
		</button>
		<button
			class:active={questsOpen}
			onclick={() => {
				questsOpen = !questsOpen;
				playUiClick();
			}}
			aria-keyshortcuts="j"
		>
			J · Misi
		</button>
		<button
			class:active={skillsOpen}
			onclick={() => {
				skillsOpen = !skillsOpen;
				playUiClick();
			}}
			aria-keyshortcuts="k"
		>
			K · Keterampilan
		</button>
		<button
			class:active={achievementsOpen}
			onclick={() => {
				achievementsOpen = !achievementsOpen;
				playUiClick();
			}}
			aria-keyshortcuts="p"
		>
			P · Pencapaian
		</button>
		<button
			class:active={mapOpen}
			onclick={() => {
				mapOpen = !mapOpen;
				playUiClick();
			}}
			aria-keyshortcuts="m"
		>
			M · Peta
		</button>
	</div>

	{#if toast}
		<div class="toast">{toast}</div>
	{/if}

	<InventoryPanel bind:open={inventoryOpen} />
	<CraftingPanel bind:open={craftingOpen} />
	<BuildingPanel bind:open={buildingOpen} />
	<QuestLogPanel bind:open={questsOpen} />
	<SkillsPanel bind:open={skillsOpen} />
	<AchievementsPanel bind:open={achievementsOpen} />
	<MapPanel bind:open={mapOpen} />

	{#if errorMsg}
		<div class="error-overlay">
			<div class="error-box">
				<h2>Terjadi Kesalahan</h2>
				<p>{errorMsg}</p>
				<button onclick={quitToMenu}>Kembali ke Menu</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.play {
		position: fixed;
		inset: 0;
		background: #0b1220;
		overflow: hidden;
	}
	/* On touch devices the on-screen joystick + buttons replace the keyboard
	   hint bar, and the top bar hugs the safe area. */
	.play.touch .controls {
		display: none;
	}
	.play.touch .topbar {
		top: max(12px, env(safe-area-inset-top));
		left: auto;
		right: max(12px, env(safe-area-inset-right));
		transform: none;
	}
	.play.touch .topbar button {
		padding: 10px 14px;
	}
	.topbar {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		display: flex;
		gap: 8px;
	}
	.topbar button,
	.controls button {
		padding: 9px 14px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-family: var(--font-ui);
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--wood-dark);
		transition:
			transform 0.08s ease,
			box-shadow 0.08s ease,
			filter 0.12s ease;
	}
	.topbar button:hover,
	.controls button:hover {
		filter: brightness(1.1);
	}
	.topbar button:active,
	.controls button:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 var(--wood-dark);
	}
	.controls {
		position: absolute;
		bottom: 16px;
		right: 16px;
		z-index: 20;
		display: flex;
		gap: 8px;
		flex-wrap: wrap-reverse;
		justify-content: flex-end;
		align-items: flex-end;
		max-width: 62vw;
	}
	.controls button {
		font-size: 0.8rem;
		padding: 8px 12px;
	}
	.controls button.active {
		background: linear-gradient(180deg, var(--green-light), var(--green));
		border-color: var(--green-dark);
		color: #16241d;
	}
	.toast {
		position: absolute;
		bottom: 124px;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(180deg, var(--panel-raised), var(--panel));
		color: var(--ink);
		padding: 10px 20px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		z-index: 30;
		font-family: var(--font-ui);
		font-weight: 700;
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 2px var(--border-warm);
		animation: toast-in 0.2s ease;
	}
	@keyframes toast-in {
		from {
			transform: translate(-50%, 10px);
			opacity: 0;
		}
	}
	.error-overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(4, 8, 6, 0.8);
		z-index: 60;
	}
	.error-box {
		background: linear-gradient(180deg, var(--panel-raised), var(--panel));
		padding: 26px;
		border-radius: var(--radius-lg);
		border: 3px solid var(--wood-dark);
		max-width: 400px;
		color: var(--ink);
		text-align: center;
		font-family: var(--font-ui);
	}
	.error-box h2 {
		margin: 0 0 10px;
		font-family: var(--font-display);
		color: var(--clay);
	}
	.error-box p {
		color: var(--ink-soft);
		line-height: 1.5;
	}
	.error-box button {
		margin-top: 16px;
		padding: 11px 22px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--green-dark);
		background: linear-gradient(180deg, var(--green-light), var(--green));
		color: #16241d;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 4px 0 var(--green-dark);
	}
	.error-box button:active {
		transform: translateY(3px);
		box-shadow: 0 1px 0 var(--green-dark);
	}
</style>
