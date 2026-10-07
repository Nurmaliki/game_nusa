import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { PhaserInput } from '../input/phaser-input';
import { darknessForHour } from '../systems/game-clock';
import { lightingForHour } from '../world/lighting';
import { SKILL_LABELS } from '../systems/skills';
import { BALANCE } from '../config/balance';
import { log } from '../core/logger';
import { getGameBus } from '../core/event-bus';
import { getGameSession } from '$stores/game-session.svelte';
import { ChunkManager } from '../world/chunk-manager';
import { ChunkRenderer, type RenderedNode } from '../world/chunk-renderer';
import { BuildController } from '../building/build-controller';
import { getBuilding } from '$data/buildings';
import { resolveTexture } from '../core/placeholders';
import { buildingTexture, playerFacingTexture, SPRITE_KEYS } from '../core/sprite-keys';
import { getResourceNode } from '$data/resources';
import { getCreature } from '$data/creatures';
import { WildlifeManager } from '../systems/wildlife';
import { CreatureRenderer } from '../world/creature-renderer';
import { NpcRenderer } from '../world/npc-renderer';
import { Feedback } from '../world/feedback';
import { Foreground } from '../world/foreground';
import { Atmosphere } from '../world/atmosphere';
import { WeatherSystem, getWeather } from '../systems/weather';
import { getNpc } from '$data/npcs';
import { getItem } from '$data/items';
import { getAchievement } from '$data/achievements';
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
	private buildingSprites = new Map<string, Phaser.GameObjects.Image>();
	/** A progress bar (bg + fill) shown while a structure is being raised. */
	private buildingProgress = new Map<string, Phaser.GameObjects.Graphics>();
	private offBuildRequest: (() => void) | null = null;
	private wildlife!: WildlifeManager;
	private creatureRenderer!: CreatureRenderer;
	private npcRenderer!: NpcRenderer;
	private feedback!: Feedback;
	private emittedMoveSignal = false;
	private weather!: WeatherSystem;
	private weatherOverlay!: Phaser.GameObjects.Rectangle;
	private rainEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
	private rainSplash?: Phaser.GameObjects.Particles.ParticleEmitter;
	private foreground!: Foreground;
	private atmosphere!: Atmosphere;
	private warmthOverlay!: Phaser.GameObjects.Rectangle;
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
		// Bring the world close so the player reads clearly and the environment
		// has presence (the default zoom=1 made everything look like tiny icons).
		this.applyCameraZoom();
		this.scale.on(Phaser.Scale.Events.RESIZE, this.applyCameraZoom, this);
		this.scale.on(Phaser.Scale.Events.RESIZE, this.onViewportResize, this);

		// Initial active-chunk load.
		this.loadChunksAround(coastX, coastY, true);

		// Ambient day/night tint. A soft, camera-fixed overlay (gentler than a
		// full-world multiply) keeps the world readable at all hours: nights dim
		// rather than blacken. Oversized so no viewport edge is ever un-tinted.
		this.ambient = this.add
			.rectangle(-64, -64, this.scale.width + 128, this.scale.height + 128, 0x1a2450, 1)
			.setOrigin(0, 0)
			.setScrollFactor(0)
			.setDepth(50000)
			.setBlendMode(Phaser.BlendModes.MULTIPLY)
			.setAlpha(0);

		// Golden "warmth" overlay: an additive tint that adds dawn/sunset glow
		// (see §21). Sits just above the ambient multiply and below the weather.
		this.warmthOverlay = this.add
			.rectangle(-64, -64, this.scale.width + 128, this.scale.height + 128, 0xffa94d, 1)
			.setOrigin(0, 0)
			.setScrollFactor(0)
			.setDepth(50000.5)
			.setBlendMode(Phaser.BlendModes.ADD)
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

		// Weather: a pure Markov walk seeded from the world seed, restored from the
		// saved id. Presentation is a camera-fixed tint plus optional rain.
		this.weather = new WeatherSystem(state.weather, state.worldSeed);
		// Emit the initial weather so the HUD never shows a stale default.
		getGameBus().emit('WEATHER_CHANGED', {
			weather: state.weather,
			intensity: getWeather(state.weather)?.intensity ?? 0
		});
		this.weatherOverlay = this.add
			.rectangle(-64, -64, this.scale.width + 128, this.scale.height + 128, 0x9fb4c8, 1)
			.setOrigin(0, 0)
			.setScrollFactor(0)
			.setDepth(50001)
			.setAlpha(0);

		// Camera-fixed framing: a soft vignette and foreground fronds that give
		// the top-down world depth (see §14 / §28). Purely presentational.
		this.foreground = new Foreground(this);
		// Ambient motes: pollen by day, fireflies by night (see §19 / §30).
		this.atmosphere = new Atmosphere(this);

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

	/** Re-lay camera-fixed framing (vignette + fronds) after a viewport resize. */
	private onViewportResize(): void {
		this.foreground?.resize();
		this.atmosphere?.resize();
	}

	/**
	 * Set the camera zoom for the current viewport so the player keeps a
	 * consistent apparent size at every resolution (see §6 / §35), while keeping
	 * the pixel art CRISP: the zoom is snapped to a value that maps world pixels
	 * onto whole device pixels as closely as possible. A fractional zoom (e.g.
	 * 1.53) makes every sprite shimmer/blur; rounding to quarter-steps keeps the
	 * character sharp without visible size jumps between screens.
	 */
	private applyCameraZoom(): void {
		const h = this.scale.height;
		const w = this.scale.width;
		const minEdge = Math.min(w, h);
		const cam = this.cameras.main;
		const { targetViewHeightPx, zoomMin, zoomMax } = BALANCE.camera;
		let zoom = h / targetViewHeightPx;
		// Very small viewports (phone landscape) see a little more world so the
		// environment stays navigable.
		if (minEdge <= BALANCE.camera.smallViewportMax) zoom = Math.min(zoom, 1.3);
		zoom = Math.max(zoomMin, Math.min(zoomMax, zoom));
		// Snap to 1/4 steps so pixel scaling stays near-integer (crisp, no shimmer)
		// while still adapting smoothly enough across common screen sizes.
		zoom = Math.round(zoom * 4) / 4;
		cam.setZoom(zoom);
		cam.setRoundPixels(true);
	}

	/**
	 * Choose the player's directional texture from its facing vector: moving up
	 * uses the back, moving down the front, and horizontal movement uses the side
	 * art (mirrored for left). Presentation only — the physics body is untouched.
	 */
	private updatePlayerFacing(): void {
		const { key, flipX } = playerFacingTexture(this.player.facingVector);
		const sprite = this.player.sprite;
		sprite.setTexture(key);
		sprite.setFlipX(flipX);
	}

	/** Keep the camera-fixed lighting overlays covering the whole viewport. */
	private resizeAmbient(): void {
		const w = this.scale.width + 128;
		const h = this.scale.height + 128;
		if (this.ambient.width !== w || this.ambient.height !== h) {
			this.ambient.setSize(w, h);
		}
		if (this.warmthOverlay.width !== w || this.warmthOverlay.height !== h) {
			this.warmthOverlay.setSize(w, h);
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
		// Face the direction of travel — swap to the up/side/down art and mirror
		// the side art for leftward movement. Pure presentation, no body change.
		this.updatePlayerFacing();
		// NOTE: no sprite scaling/bobbing for the player. A fractional "breath"
		// scale (1.0±0.02) blurred the pixel art under the camera zoom, and moving
		// the sprite would drag its physics body. The player stays pixel-crisp and
		// rock-steady; ambient life comes from the world around it (§5 / §15).
		this.player.sprite.setScale(1, 1);

		const moving = (this.player.sprite.body as Phaser.Physics.Arcade.Body).speed > 4;

		// First-session tutorial: the move step completes on the first step taken.
		if (moving && !this.emittedMoveSignal) {
			this.emittedMoveSignal = true;
			getGameBus().emit('TUTORIAL_SIGNAL', { signal: 'move' });
		}

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

		// Construction: raise in-progress buildings and swap their visuals once done.
		this.updateConstruction(state, delta);

		// Weather: advance the walk, then repaint the overlay + emit on change.
		this.updateWeather(state, delta);

		// Time-of-day lighting: a multiply ambient tint (deep blue at night, not
		// black) plus an additive golden warmth at dawn/sunset (§20–§22).
		const light = lightingForHour(state.clock.hour);
		this.ambient.setFillStyle(light.ambientColor, 1);
		this.ambient.setAlpha(light.ambientAlpha);
		this.warmthOverlay.setFillStyle(light.warmColor, 1);
		this.warmthOverlay.setAlpha(light.warmAlpha);
		this.resizeAmbient();
		// Gentle foreground sway + player lantern glow (no-op under reduced motion).
		this.foreground.update(
			time,
			settingsStore.reducedMotion,
			this.player.position.x,
			this.player.position.y,
			darknessForHour(state.clock.hour)
		);
		// Wind sway on living vegetation (no-op under reduced motion).
		this.chunkRenderer.animate(time, settingsStore.reducedMotion);
		// Ambient motes drift across the viewport (pollen/fireflies).
		this.atmosphere.update(time, state.clock.hour, settingsStore.reducedMotion);

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
			this.flushAchievements(state);
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

	/**
	 * Evaluate achievements against current progress and, for any newly unlocked,
	 * fire the SFX, a toast, and a single ACHIEVEMENTS_UNLOCKED event (so the
	 * achievements panel can refresh). Cheap: the engine early-outs per id.
	 */
	private flushAchievements(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		const fresh = state.evaluateAchievements();
		if (fresh.length === 0) return;
		for (const id of fresh) {
			const def = getAchievement(id);
			getGameBus().emit('TOAST', {
				text: `Pencapaian: ${def?.name ?? id}`,
				kind: 'success'
			});
		}
		getGameBus().emit('SFX', { id: 'achievement' });
		getGameBus().emit('ACHIEVEMENTS_UNLOCKED', { ids: fresh });
	}

	/**
	 * Advance the weather walk and drive its presentation. The overlay is a
	 * camera-fixed tint whose colour/alpha come from the weather definition;
	 * rain/storm also spray short-lived streaks. Respects reduced motion by
	 * skipping the streak particles (the tint alone still conveys the weather).
	 */
	private updateWeather(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		delta: number
	): void {
		const changed = this.weather.advance(delta);
		const id = this.weather.current;

		if (changed) {
			state.weather = changed;
			const def = getWeather(changed);
			const name = def?.name ?? changed;
			getGameBus().emit('WEATHER_CHANGED', { weather: changed, intensity: def?.intensity ?? 0 });
			if (changed !== 'clear') {
				getGameBus().emit('TOAST', { text: `Cuaca: ${name}`, kind: 'info' });
			}
			if (changed === 'rain') getGameBus().emit('SFX', { id: 'weather_rain' });
			if (changed === 'storm') getGameBus().emit('SFX', { id: 'weather_thunder' });
		}

		// Visual overlay: grey-blue tint, denser for storms/fog.
		const vis = this.weather.visibility();
		const alpha = (1 - vis) * 0.5;
		this.weatherOverlay.setAlpha(alpha);
		if (id === 'storm') this.weatherOverlay.setFillStyle(0x2a3548, 1);
		else if (id === 'fog') this.weatherOverlay.setFillStyle(0xc7d2dc, 1);
		else this.weatherOverlay.setFillStyle(0x7e8ca0, 1);

		// Rain streaks: spawn/despawn a single emitter as the weather demands.
		const needsRain = (id === 'rain' || id === 'storm') && !settingsStore.reducedMotion;
		if (needsRain && !this.rainEmitter) this.rainEmitter = this.createRain();
		else if (!needsRain && this.rainEmitter) {
			this.rainEmitter.destroy();
			this.rainEmitter = undefined;
			this.rainSplash?.destroy();
			this.rainSplash = undefined;
		}
	}

	/** A camera-fixed rain emitter (streaks falling across the viewport). */
	private createRain(): Phaser.GameObjects.Particles.ParticleEmitter {
		const w = this.scale.width;
		const h = this.scale.height;
		// Rain splash dots need a small round texture; reuse the ambient mote
		// (created by Atmosphere) but guard in case order ever changes.
		if (!this.textures.exists('atmo_mote')) {
			const g = this.make.graphics({ x: 0, y: 0 }, false);
			g.fillStyle(0xffffff, 1);
			g.fillCircle(2, 2, 2);
			g.generateTexture('atmo_mote', 6, 6);
			g.destroy();
		}
		const zoneConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
			type: 'random',
			// A RandomZoneSource only needs getRandomPoint; a plain closure avoids
			// the Vector2/Vector2Like mismatch between Geom.Rectangle and the type.
			source: {
				getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
					point.x = Math.random() * w;
					point.y = 0;
					return point;
				}
			}
		};
		// Ground splash: tiny rising/fading dots where rain lands, so the rain
		// reads as hitting a wet surface (§23) rather than streaks over a dry one.
		this.rainSplash = this.add
			.particles(0, 0, 'atmo_mote', {
				x: { min: 0, max: w },
				y: { min: h * 0.35, max: h },
				lifespan: { min: 220, max: 380 },
				speedY: { min: -30, max: -10 },
				speedX: { min: -8, max: 8 },
				scale: { min: 0.3, max: 0.6 },
				alpha: { start: 0.5, end: 0 },
				quantity: 1,
				frequency: 90,
				maxAliveParticles: 30
			})
			.setParticleTint(0xbfd4e6)
			.setScrollFactor(0)
			.setDepth(50002.5);
		return this.add
			.particles(0, -16, undefined, {
				x: { min: -40, max: w + 40 },
				y: -16,
				lifespan: 900,
				speedY: { min: 420, max: 560 },
				speedX: { min: -40, max: -10 },
				scaleX: 0.35,
				scaleY: { min: 0.7, max: 1.1 },
				alpha: { start: 0.55, end: 0 },
				quantity: 3,
				frequency: 40,
				emitZone: zoneConfig
			})
			.setScrollFactor(0)
			.setDepth(50002);
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

	/**
	 * Advance construction and sync visuals: buildings in progress show the
	 * scaffold + a progress bar, and on completion swap to their finished sprite
	 * with a toast + dust puff so the change reads as an event.
	 */
	private updateConstruction(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		deltaMs: number
	): void {
		const finished = state.advanceConstruction(deltaMs);
		for (const b of finished) {
			this.feedback.burst(b.position.x, b.position.y - 12, 0xd8c48a, 8);
			const name = getBuilding(b.definitionId)?.name ?? 'Bangunan';
			getGameBus().emit('TOAST', { text: `${name} selesai dibangun`, kind: 'success' });
			getGameBus().emit('SFX', { id: 'build' });
			// The tutorial's "build" step completes when a structure is finished.
			getGameBus().emit('TUTORIAL_SIGNAL', { signal: 'build' });
		}
		for (const b of state.buildings) this.refreshBuildingVisual(state, b.id);
	}

	private renderBuildings(state: NonNullable<ReturnType<typeof getGameSession>['state']>): void {
		for (const b of state.buildings) {
			this.renderBuilding(b.id, b.definitionId, b.position);
			// Restored builds that are already complete show the finished sprite
			// straight away; in-progress ones keep the scaffold + progress bar.
			this.refreshBuildingVisual(state, b.id);
		}
	}

	/**
	 * Create (or fetch) the image object for a placed building. While under
	 * construction the sprite is the scaffold; `refreshBuildingVisual` swaps it
	 * to the finished texture once construction completes.
	 */
	private renderBuilding(
		id: string,
		definitionId: string,
		position: { x: number; y: number }
	): void {
		if (this.buildingSprites.has(id)) return;
		const texture = resolveTexture(this, buildingTexture(definitionId));
		const img = this.add
			.image(position.x, position.y, texture)
			.setOrigin(0.5, 0.78)
			.setDepth(position.y);
		this.buildingSprites.set(id, img);
	}

	/**
	 * Sync a single building's visual with its construction state: scaffold +
	 * progress bar while raising, the finished sprite when done. Cheap to call
	 * every frame.
	 */
	private refreshBuildingVisual(
		state: NonNullable<ReturnType<typeof getGameSession>['state']>,
		id: string
	): void {
		const b = state.buildings.find((x) => x.id === id);
		const img = this.buildingSprites.get(id);
		if (!b || !img) return;
		const complete = state.isBuildingComplete(b);
		const texture = resolveTexture(
			this,
			complete ? buildingTexture(b.definitionId) : SPRITE_KEYS.scaffold
		);
		if (img.texture.key !== texture) {
			img.setTexture(texture);
			img.setOrigin(0.5, complete ? 0.78 : 0.9);
		}
		img.setDepth(b.position.y);

		const total = b.buildMs ?? 0;
		const elapsed = b.buildElapsedMs ?? 0;
		const building = !complete && total > 0;
		let bar = this.buildingProgress.get(id);
		if (building) {
			if (!bar) {
				bar = this.add.graphics();
				this.buildingProgress.set(id, bar);
			}
			const w = 36;
			const h = 5;
			const x = b.position.x - w / 2;
			const y = b.position.y - 44;
			const ratio = Math.max(0, Math.min(1, elapsed / total));
			bar.clear();
			bar.setDepth(b.position.y + 1);
			// Track.
			bar.fillStyle(0x0b1220, 0.85);
			bar.fillRect(x - 1, y - 1, w + 2, h + 2);
			// Fill.
			bar.fillStyle(0x48bb78, 1);
			bar.fillRect(x, y, w * ratio, h);
		} else if (bar) {
			bar.destroy();
			this.buildingProgress.delete(id);
		}
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
				if (defId) {
					const placed = state.buildings.find((b) => b.id === id);
					if (placed) this.renderBuilding(id, defId, placed.position);
					else this.renderBuilding(id, defId, { x: world.x, y: world.y });
					// Show the scaffold + progress bar immediately.
					this.refreshBuildingVisual(state, id);
					const name = getBuilding(defId)?.name ?? 'Bangunan';
					getGameBus().emit('TOAST', { text: `Mulai membangun: ${name}`, kind: 'info' });
				}
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

		// Tutorial: any successful swing counts as gathering.
		getGameBus().emit('TUTORIAL_SIGNAL', { signal: 'gather' });

		const def = getResourceNode(node.typeId);
		const isFishing = (def?.skill ?? 'gathering') === 'fishing';

		this.shake(60, BALANCE.camera.shakeIntensity * 0.6);
		getGameBus().emit('SFX', { id: isFishing ? 'fish_catch' : 'harvest' });
		// A blue "splash" for fishing, a tan dust puff otherwise.
		this.feedback.burst(
			node.worldX,
			node.worldY - 8,
			isFishing ? 0x57a9dd : 0xd8c48a,
			isFishing ? 7 : 5
		);

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
		this.scale.off(Phaser.Scale.Events.RESIZE, this.applyCameraZoom, this);
		this.scale.off(Phaser.Scale.Events.RESIZE, this.onViewportResize, this);
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
		this.warmthOverlay.destroy();
		this.foreground.destroy();
		this.atmosphere.destroy();
		this.weatherOverlay.destroy();
		this.rainEmitter?.destroy();
		this.rainEmitter = undefined;
		this.rainSplash?.destroy();
		this.rainSplash = undefined;
		for (const s of this.buildingSprites.values()) s.destroy();
		this.buildingSprites.clear();
		for (const s of this.buildingProgress.values()) s.destroy();
		this.buildingProgress.clear();
		log.info('WORLD', 'World scene shut down');
	}
}
