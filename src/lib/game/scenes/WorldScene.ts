import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { PhaserInput } from '../input/phaser-input';
import { darknessForHour } from '../systems/game-clock';
import { SKILL_LABELS } from '../systems/skills';
import { BALANCE } from '../config/balance';
import { log } from '../core/logger';
import { getGameBus } from '../core/event-bus';
import { getGameSession } from '$stores/game-session.svelte';
import { ChunkManager } from '../world/chunk-manager';
import { ChunkRenderer, type RenderedNode } from '../world/chunk-renderer';
import { BuildController } from '../building/build-controller';
import { getBuilding } from '$data/buildings';
import { getResourceNode } from '$data/resources';
import { getCreature } from '$data/creatures';
import { WildlifeManager } from '../systems/wildlife';
import { CreatureRenderer } from '../world/creature-renderer';
import { NpcRenderer } from '../world/npc-renderer';
import { Feedback } from '../world/feedback';
import { getNpc } from '$data/npcs';
import { getItem } from '$data/items';
import { registerControls, clearControls } from '../input/controls-bridge';
import { settingsStore } from '$stores/settings.svelte';
import type { BiomeId } from '$types/core';

/**
 * World scene (Phase 3): chunk-based world with three biomes.
 *
 * Loads chunks within the active radius around the player, renders their ground
 * and resources, unloads distant chunks, and tracks biome transitions. Reads and
 * writes the shared GameState.
 */
export class WorldScene extends Phaser.Scene {
	private controls!: PhaserInput;
	private player!: Player;
	private chunks!: ChunkManager;
	private chunkRenderer!: ChunkRenderer;
	private ambient!: Phaser.GameObjects.Rectangle;
	private lastTimeEmit = 0;
	private lastStatsEmit = 0;
	private lastChunkCheck = 0;
	private lastInteractTarget: RenderedNode | null = null;
	private currentBiome: BiomeId = 'tropical_coast';
	private discovered = new Set<BiomeId>();
	private build!: BuildController;
	private buildingSprites = new Map<string, Phaser.GameObjects.Rectangle>();
	private buildingDetail = new Map<string, Phaser.GameObjects.Rectangle>();
	private offBuildRequest: (() => void) | null = null;
	private wildlife!: WildlifeManager;
	private creatureRenderer!: CreatureRenderer;
	private npcRenderer!: NpcRenderer;
	private feedback!: Feedback;
	private dialogueOpen = false;
	private offDialogueClose: (() => void) | null = null;
	private attackCooldownUntil = 0;
	private invulnUntil = 0;

	constructor() {
		super('World');
	}

	create(): void {
		const session = getGameSession();
		if (!session.hasActive()) session.newGame();
		const state = session.state!;

		this.controls = new PhaserInput(this);
		// Publish the live control handle for the mobile/on-screen controls.
		registerControls({
			setMove: (v) => this.controls.setVirtualMove(v),
			press: (a) => this.controls.synthPress(a),
			setHeld: (a, held) => this.controls.synthHold(a, held)
		});

		this.chunks = new ChunkManager(state.worldSeed);
		this.physics.world.setBounds(0, 0, this.chunks.pixelWidth, this.chunks.pixelHeight);
		this.cameras.main.setBounds(0, 0, this.chunks.pixelWidth, this.chunks.pixelHeight);

		this.chunkRenderer = new ChunkRenderer(this, this.chunks, (id) => state.isNodeHarvested(id));

		// Player starts at the saved position, or on the tropical coast. New games
		// spawn at ~20% inwardness from the island edge (the starter biome) rather
		// than the centre, which would drop the player in the highlands.
		const coastX = state.player.position.x || this.coastSpawnX();
		const coastY = state.player.position.y || this.coastSpawnY();
		this.player = new Player(this, coastX, coastY);
		this.cameras.main.startFollow(
			this.player.sprite,
			true,
			BALANCE.camera.followLerp,
			BALANCE.camera.followLerp
		);

		// Initial active-chunk load.
		this.loadChunksAround(coastX, coastY, true);

		// Ambient day/night tint. A soft, camera-fixed overlay (gentler than a
		// full-world multiply) keeps the world readable at all hours: nights dim
		// rather than blacken. Oversized so no viewport edge is ever un-tinted.
		this.ambient = this.add
			.rectangle(-64, -64, this.scale.width + 128, this.scale.height + 128, 0x0a1436, 1)
			.setOrigin(0, 0)
			.setScrollFactor(0)
			.setDepth(50000)
			.setBlendMode(Phaser.BlendModes.MULTIPLY)
			.setAlpha(0);

		this.currentBiome = this.chunks.biomeAt(coastX, coastY).id;
		state.setBiome(this.currentBiome);
		// Emit the initial biome so the HUD never shows a stale default label.
		const initialBiome = this.chunks.biomeAt(coastX, coastY);
		getGameBus().emit('BIOME_CHANGED', {
			biome: initialBiome.id,
			name: initialBiome.name
		});

		// Wildlife: spawn manager + renderer.
		let rngTick = 0;
		this.wildlife = new WildlifeManager(() => state.seededRandom(`wildlife_${rngTick++}`));
		this.creatureRenderer = new CreatureRenderer(this);
		this.feedback = new Feedback(this);

		// NPCs: place anchors + render, then accept a dialogue-close signal.
		state.npcs.placeAnchors(this.chunks.pixelWidth, this.chunks.pixelHeight);
		this.npcRenderer = new NpcRenderer(this);
		this.npcRenderer.build(state.npcs, state.clock.hour);
		this.offDialogueClose = getGameBus().on('DIALOGUE_CLOSED', () => {
			this.dialogueOpen = false;
		});

		// Build mode: ghost placement preview + committed building rendering.
		this.build = new BuildController(this, BALANCE.world.tileSize);
		this.renderBuildings(state);
		this.offBuildRequest = getGameBus().on('BUILD_MODE_REQUEST', (p) => {
			if (p.definitionId) {
				const ok = this.build.begin(p.definitionId);
				if (ok) {
					getGameBus().emit('BUILD_MODE_CHANGED', { definitionId: p.definitionId });
					getGameBus().emit('TOAST', { text: 'Mode bangun: klik untuk menempatkan', kind: 'info' });
				}
			} else {
				this.build.cancel();
				getGameBus().emit('BUILD_MODE_CHANGED', { definitionId: null });
			}
		});

		getGameBus().emit('GAME_STATE_READY', undefined);
		log.info('WORLD', 'World scene ready (Phase 3, chunked)');

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
	}

	/** Keep the camera-fixed ambient overlay covering the whole viewport. */
	private resizeAmbient(): void {
		const w = this.scale.width + 128;
		const h = this.scale.height + 128;
		if (this.ambient.width !== w || this.ambient.height !== h) {
			this.ambient.setSize(w, h);
		}
	}

	/**
	 * Spawn point on the tropical coast: 20% inwardness from the island edge.
	 * `biomeAt` bands coast at inwardness [0, 0.42), so this is safely coastal.
	 */
	private coastSpawnX(): number {
		return this.chunks.pixelWidth * 0.5;
	}

	private coastSpawnY(): number {
		// Offset vertically from the centre into the outer (coast) ring rather
		// than the highland core at the exact centre.
		return this.chunks.pixelHeight * 0.86;
	}

	private loadChunksAround(x: number, y: number, initial = false): void {
		const { entered, exited } = this.chunks.updateActive(x, y);
		this.chunkRenderer.apply(entered, exited);
		if (!initial && entered.length > 0) {
			// Exploration progress (Phase 7 will feed skills).
			log.debug('WORLD', `Loaded ${entered.length} chunk(s), unloaded ${exited.length}`);
		}
	}

	update(time: number, delta: number): void {
		this.controls.beginFrame();
		const session = getGameSession();
		const state = session.state!;

		this.player.update(this.controls, state.stats.energy, time);
		state.player.position = this.player.position;
		// Y-sort the player among world objects so tall sprites overlap correctly.
		this.player.sprite.setDepth(this.player.position.y);
		// A tiny idle "breath" (scale only — never touches the physics body).
		const moving = (this.player.sprite.body as Phaser.Physics.Arcade.Body).speed > 4;
		const breath = moving ? 1 : 1 + Math.sin(time / 420) * 0.02;
		this.player.sprite.setScale(1, breath);

		// Chunk streaming: re-evaluate periodically (cheap, not per-frame).
		if (time - this.lastChunkCheck > 200) {
			this.lastChunkCheck = time;
			this.loadChunksAround(this.player.position.x, this.player.position.y);
			this.updateBiome(state);
		}

		// Hotbar selection (keys 1..5).
		this.handleHotbarInput(state);

		// Survival + clock.
		state.clock.advance(delta);
		state.advanceSurvival(delta, { sprinting: this.player.isSprinting(this.controls) });

		const darkness = darknessForHour(state.clock.hour);
		// Gentle curve: nights dim to ~0.42 max instead of blacking out.
		this.ambient.setAlpha(Math.max(0, Math.min(0.42, darkness * 0.42)));
		this.resizeAmbient();

		// Death check.
		if (state.stats.health <= 0 && !state.player.isDead) {
			this.onDeath(state);
		}

		if (this.build.isActive()) {
			this.updateBuildMode(state);
		} else if (!this.dialogueOpen) {
			this.updateInteraction(state);
		}

		this.updateWildlife(state, time, delta);
		this.npcRenderer.sync(state.npcs, state.clock.hour, time);

		if (time - this.lastTimeEmit > 250) {
			this.lastTimeEmit = time;
			getGameBus().emit('TIME_CHANGED', {
				fraction: state.clock.dayFraction,
				day: state.clock.day,
				phase: state.clock.phase,
				clock: state.clock.clockString
			});
		}
		if (time - this.lastStatsEmit > 500) {
			this.lastStatsEmit = time;
			session.emitStats();
		}

		this.flushSkillEvents(state);

		this.controls.endFrame();
	}

	/**
	 * Surface skill level-ups collected by the pure Skills system: fire the
	 * SKILLS_CHANGED snapshot (so panels refresh) and, per level gained, a
	 * SKILL_LEVEL_UP event (sound) plus a toast. Drained once per gain.
	 */
	private flushSkillEvents(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		const gains = state.skills.drainLevelUps();
		if (gains.length === 0) return;
		getGameBus().emit('SKILLS_CHANGED', { skills: state.skills.snapshot() });
		for (const g of gains) {
			getGameBus().emit('SKILL_LEVEL_UP', { id: g.id, level: g.level });
			const label = SKILL_LABELS[g.id] ?? g.id;
			getGameBus().emit('TOAST', { text: `${label} naik ke level ${g.level}`, kind: 'success' });
		}
	}

	private updateBiome(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		const biomeDef = this.chunks.biomeAt(this.player.position.x, this.player.position.y);
		if (biomeDef.id !== this.currentBiome) {
			this.currentBiome = biomeDef.id;
			state.setBiome(biomeDef.id);
			getGameBus().emit('BIOME_CHANGED', { biome: biomeDef.id, name: biomeDef.name });
			if (!this.discovered.has(biomeDef.id)) {
				this.discovered.add(biomeDef.id);
				getGameBus().emit('TOAST', { text: `Menemukan: ${biomeDef.name}`, kind: 'info' });
			}
		}
	}

	private updateWildlife(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		time: number,
		delta: number
	): void {
		// Spawn/despawn around the player (biome-biased).
		this.wildlife.maybeSpawn(
			{
				playerPos: this.player.position,
				biomeAt: (x, y) => this.chunks.biomeAt(x, y).id,
				worldWidth: this.chunks.pixelWidth,
				worldHeight: this.chunks.pixelHeight
			},
			time
		);

		// Step AI and collect attacks on the player.
		const attacks = this.wildlife.step(this.player.position, !state.player.isDead, delta, time);
		for (const atk of attacks) {
			if (time < this.invulnUntil) continue;
			this.invulnUntil = time + BALANCE.combat.invulnMs;
			const kb = state.damagePlayer(
				atk.damage,
				atk.creature.position,
				atk.knockback * (1 - BALANCE.combat.knockbackResistance)
			);
			const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
			body.setVelocity(kb.x, kb.y);
			this.shake(120, BALANCE.camera.shakeIntensity * 1.5);
			this.feedback.floatText(
				this.player.position.x,
				this.player.position.y - 24,
				`-${atk.damage}`,
				'#ff6b6b'
			);
			this.feedback.burst(this.player.position.x, this.player.position.y - 10, 0xff6b6b, 5);
			getGameBus().emit('PLAYER_DAMAGED', {
				amount: atk.damage,
				health: state.stats.health
			});
			getGameSession().emitStats();
		}

		// Player attack input (disabled while in build mode).
		if (!this.build.isActive()) {
			if (this.controls.justPressed('ATTACK') || this.controls.justPressed('HEAVY_ATTACK')) {
				const heavy = this.controls.justPressed('HEAVY_ATTACK');
				this.controls.consume('ATTACK');
				this.controls.consume('HEAVY_ATTACK');
				this.playerAttack(state, heavy ? 'heavy' : 'light', time);
			}
		} else {
			this.controls.consume('ATTACK');
		}

		this.creatureRenderer.sync(this.wildlife.all(), time);
	}

	private playerAttack(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		kind: 'light' | 'heavy',
		time: number
	): void {
		if (time < this.attackCooldownUntil) return;
		const r = state.attack(this.player.position, kind, () => state.seededRandom(`atk_${time}`));
		if (!r.ok) return;
		this.attackCooldownUntil = time + r.value.result.cooldownMs;
		getGameBus().emit('SFX', { id: kind === 'heavy' ? 'attack_heavy' : 'attack_light' });

		// Find the creature nearest the player within the attack range.
		const target = this.wildlife.nearest(this.player.position, r.value.result.range + 16);
		if (target) {
			const killed = this.wildlife.damageNearest(target.position, 60, r.value.result.damage);
			state.recordCombatHit();
			this.shake(80, BALANCE.camera.shakeIntensity);
			this.feedback.impact(
				target.position.x,
				target.position.y - 18,
				r.value.result.damage,
				r.value.result.isCritical
			);
			getGameBus().emit('COMBAT_HIT', {
				damage: r.value.result.damage,
				isCritical: r.value.result.isCritical
			});
			if (killed && killed.state === 'dead') {
				const creatureDef = getCreature(killed.definitionId);
				if (creatureDef) {
					const drops = state.grantLoot(creatureDef.loot, () => state.seededRandom(`loot_${time}`));
					const names = drops.map((d) => `${getItem(d.id)?.name ?? d.id} x${d.qty}`).join(', ');
					if (names) getGameBus().emit('TOAST', { text: `Kalah: +${names}`, kind: 'success' });
					this.wildlife.reapDead();
				}
			}
			getGameSession().emitStats();
			getGameSession().notifyInventory();
		}
	}

	private openDialogue(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		npcId: string
	): void {
		const def = getNpc(npcId);
		if (!def) return;
		this.dialogueOpen = true;
		state.talkToNpc(npcId, def.rootDialogue);
		getGameBus().emit('INTERACTION_PROMPT', { text: null });
		getGameBus().emit('DIALOGUE_OPENED', {
			npcId,
			npcName: def.name,
			role: def.role,
			nodeId: def.rootDialogue
		});
	}

	private renderBuildings(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		for (const b of state.buildings) this.renderBuilding(b.id, b.definitionId, b.position);
	}

	private renderBuilding(
		id: string,
		definitionId: string,
		position: { x: number; y: number }
	): void {
		if (this.buildingSprites.has(id)) return;
		const def = getBuilding(definitionId);
		if (!def) return;
		const tile = BALANCE.world.tileSize;
		const w = def.size.w * tile;
		const h = def.size.h * tile;
		const solid = def.solid;
		const rect = this.add
			.rectangle(position.x, position.y, w, h, solid ? 0xb8a06a : 0x9c7b4a, 1)
			.setStrokeStyle(2, solid ? 0x6b4a2f : 0x4a3220, 1)
			.setDepth(position.y);
		// Cross-plank detail so structures read as built, not flat blocks.
		const detail = this.add
			.rectangle(position.x, position.y, w - 6, h - 6, 0x000000, 0)
			.setStrokeStyle(1, solid ? 0xd8c48a : 0xc0a878, 0.7)
			.setDepth(position.y + 0.01);
		this.buildingDetail.set(id, detail);
		this.buildingSprites.set(id, rect);
	}

	private updateBuildMode(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		if (!this.build.isActive()) return;
		const pointer = this.input.activePointer;
		const world: { x: number; y: number } = { x: pointer.worldX, y: pointer.worldY };
		const nodes = this.chunkRenderer.activeNodes();

		// Rotate with R.
		if (this.controls.justPressed('ROTATE')) {
			this.controls.consume('ROTATE');
			this.build.rotate();
		}

		this.build.update(state, world, nodes);

		// Confirm with left click; cancel with right click or Escape.
		if (pointer.leftButtonDown()) {
			const id = this.build.commit(state, world, nodes);
			if (id) {
				const defId = this.build.definitionId();
				if (defId) this.renderBuilding(id, defId, { x: world.x, y: world.y });
				getGameBus().emit('TOAST', { text: 'Bangunan dibangun', kind: 'success' });
				getGameSession().notifyInventory();
				this.build.cancel();
				getGameBus().emit('BUILD_MODE_CHANGED', { definitionId: null });
			}
		}
		if (this.controls.justPressed('PAUSE')) {
			this.controls.consume('PAUSE');
			this.build.cancel();
			getGameBus().emit('BUILD_MODE_CHANGED', { definitionId: null });
		}
	}

	private handleHotbarInput(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		const keys: Array<[string, number]> = [
			['HOTBAR_1', 0],
			['HOTBAR_2', 1],
			['HOTBAR_3', 2],
			['HOTBAR_4', 3],
			['HOTBAR_5', 4]
		];
		for (const [action, slot] of keys) {
			if (this.controls.justPressed(action as never)) {
				this.controls.consume(action as never);
				state.equipment.select(slot);
				getGameBus().emit('HOTBAR_CHANGED', { activeSlot: slot });
			}
		}
	}

	/** Respect the player's screen-shake preference (Phase 10 polish). */
	private shake(durationMs: number, intensity: number): void {
		if (!settingsStore.screenShake) return;
		this.cameras.main.shake(durationMs, intensity);
	}

	private onDeath(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		state.die(this.player.position);
		getGameBus().emit('PLAYER_DIED', undefined);
		getGameBus().emit('TOAST', {
			text: 'Anda tumbang. Tas tertinggal di lokasi ini.',
			kind: 'warning'
		});
		// Respawn at the last anchor (or island centre as fallback).
		const anchor = state.player.respawnPoint ?? {
			x: this.chunks.pixelWidth / 2,
			y: this.chunks.pixelHeight / 2
		};
		state.respawn();
		this.player.sprite.setPosition(anchor.x, anchor.y);
		this.loadChunksAround(anchor.x, anchor.y);
		getGameBus().emit('PLAYER_RESPAWNED', undefined);
		getGameSession().notifyInventory();
	}

	private updateInteraction(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		const p = this.player.position;

		// NPCs take highest priority: talking to people beats everything else.
		const nearbyNpc = state.npcs.nearest(p, BALANCE.resource.interactRange, state.clock.hour);
		if (nearbyNpc) {
			this.lastInteractTarget = null;
			getGameBus().emit('NPC_NEARBY', { npcId: nearbyNpc.def.id, name: nearbyNpc.def.name });
			getGameBus().emit('INTERACTION_PROMPT', { text: `E: Bicara dengan ${nearbyNpc.def.name}` });
			if (this.controls.justPressed('INTERACT')) {
				this.controls.consume('INTERACT');
				this.openDialogue(state, nearbyNpc.def.id);
			}
			return;
		}
		getGameBus().emit('NPC_NEARBY', { npcId: null, name: null });

		// Backpack recovery takes priority over gathering.
		const backpack = state.nearestBackpack(p, BALANCE.resource.interactRange);
		if (backpack) {
			this.lastInteractTarget = null;
			getGameBus().emit('INTERACTION_PROMPT', { text: 'E: Ambil Tas' });
			if (this.controls.justPressed('INTERACT')) {
				this.controls.consume('INTERACT');
				const r = state.recoverBackpack(backpack.id);
				if (r.ok) {
					getGameBus().emit('TOAST', { text: 'Tas diambil kembali', kind: 'success' });
					getGameSession().notifyInventory();
				} else {
					getGameBus().emit('TOAST', { text: 'Tas penuh!', kind: 'warning' });
				}
			}
			return;
		}

		let nearest: RenderedNode | null = null;
		let nearestDist: number = BALANCE.resource.interactRange;

		for (const n of this.chunkRenderer.activeNodes()) {
			if (!n.sprite.visible) continue;
			const d = Math.hypot(n.worldX - p.x, n.worldY - p.y);
			if (d < nearestDist) {
				nearestDist = d;
				nearest = n;
			}
		}

		if (nearest !== this.lastInteractTarget) {
			this.lastInteractTarget = nearest;
			const def = nearest ? getResourceNode(nearest.typeId) : null;
			getGameBus().emit('INTERACTION_PROMPT', { text: def ? `E: ${def.name}` : null });
		}

		if (nearest && this.controls.justPressed('INTERACT')) {
			this.controls.consume('INTERACT');
			this.doHarvest(state, nearest);
		}
	}

	private doHarvest(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		node: RenderedNode
	): void {
		const result = state.harvest(node.typeId, node.instanceId);
		if (!result.ok) return;

		this.shake(60, BALANCE.camera.shakeIntensity * 0.6);
		getGameBus().emit('SFX', { id: 'harvest' });
		this.feedback.burst(node.worldX, node.worldY - 8, 0xd8c48a, 5);

		if (!state.nodeHasWork(node.instanceId)) {
			state.markNodeHarvested(node.instanceId);
			this.chunkRenderer.markHarvested(node.instanceId);
			this.lastInteractTarget = null;
			getGameBus().emit('INTERACTION_PROMPT', { text: null });
			const toasts = result.value.map((s) => `${getItem(s.id)?.name ?? s.id} x${s.qty}`).join(', ');
			if (toasts) {
				getGameBus().emit('TOAST', { text: `+${toasts}`, kind: 'success' });
				this.feedback.floatText(node.worldX, node.worldY - 20, `+${toasts}`, '#a8e6a1');
			}
		} else {
			node.sprite.setAlpha(0.7 + 0.3 * Math.random());
		}

		getGameSession().notifyInventory();
	}

	private teardown(): void {
		this.offBuildRequest?.();
		this.offDialogueClose?.();
		clearControls();
		this.build.destroy();
		this.creatureRenderer.destroy();
		this.npcRenderer.destroy();
		this.wildlife.clear();
		this.controls.destroy();
		this.player.destroy();
		this.chunkRenderer.destroy();
		this.chunks.clear();
		this.ambient.destroy();
		for (const s of this.buildingSprites.values()) s.destroy();
		this.buildingSprites.clear();
		for (const s of this.buildingDetail.values()) s.destroy();
		this.buildingDetail.clear();
		log.info('WORLD', 'World scene shut down');
	}
}
