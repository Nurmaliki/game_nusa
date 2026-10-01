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
	import InteractionPrompt from '$lib/components/hud/InteractionPrompt.svelte';
	import InventoryPanel from '$lib/components/inventory/InventoryPanel.svelte';
	import CraftingPanel from '$lib/components/crafting/CraftingPanel.svelte';
	import BuildingPanel from '$lib/components/building/BuildingPanel.svelte';
	import QuestLogPanel from '$lib/components/quests/QuestLogPanel.svelte';
	import SkillsPanel from '$lib/components/hud/SkillsPanel.svelte';
	import { getGameBus } from '$game/core/event-bus';
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
		inventoryOpen || craftingOpen || buildingOpen || questsOpen || skillsOpen
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
					state.addBuilding(buildingId, { ...state.player.position }, []);
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
				stats: () => {
					const s = session.state?.stats;
					return s
						? { health: s.health, hunger: s.hunger, thirst: s.thirst, energy: s.energy }
						: null;
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
		} else if (e.key === 'Escape') {
			inventoryOpen = false;
			craftingOpen = false;
			buildingOpen = false;
			questsOpen = false;
			skillsOpen = false;
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
	<Hotbar />
	<DeathOverlay />
	<DamageFlash />
	<InteractionPrompt />
	<QuestTracker />
	<DialoguePanel />
	<ChapterCompleteOverlay />
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
	</div>

	{#if toast}
		<div class="toast">{toast}</div>
	{/if}

	<InventoryPanel bind:open={inventoryOpen} />
	<CraftingPanel bind:open={craftingOpen} />
	<BuildingPanel bind:open={buildingOpen} />
	<QuestLogPanel bind:open={questsOpen} />
	<SkillsPanel bind:open={skillsOpen} />

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
		right: max(12px, env(safe-area-inset-right));
	}
	.play.touch .topbar button {
		padding: 10px 14px;
	}
	.topbar {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 20;
		display: flex;
		gap: 8px;
	}
	.topbar button,
	.controls button {
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(11, 18, 32, 0.75);
		color: #f7fafc;
		cursor: pointer;
		font-family: var(--font-ui);
	}
	.controls {
		position: absolute;
		bottom: 16px;
		right: 16px;
		z-index: 20;
		display: flex;
		gap: 8px;
	}
	.controls button.active {
		background: #38a169;
		border-color: #38a169;
	}
	.toast {
		position: absolute;
		bottom: 96px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(11, 18, 32, 0.9);
		color: #f7fafc;
		padding: 8px 16px;
		border-radius: 8px;
		z-index: 30;
		font-family: var(--font-ui);
	}
	.error-overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(0, 0, 0, 0.75);
		z-index: 60;
	}
	.error-box {
		background: #1a202c;
		padding: 24px;
		border-radius: 12px;
		max-width: 380px;
		color: #f7fafc;
		text-align: center;
		font-family: var(--font-ui);
	}
	.error-box button {
		margin-top: 12px;
		padding: 8px 16px;
		border-radius: 8px;
		border: none;
		background: #38a169;
		color: white;
		cursor: pointer;
	}
</style>
