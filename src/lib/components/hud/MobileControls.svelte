<script lang="ts">
	import { setVirtualMove, virtualPress, setVirtualHeld } from '$game/input/controls-bridge';
	import type { InputAction } from '$game/input/actions';

	/**
	 * On-screen touch controls (§44): a draggable joystick for movement plus
	 * discrete action buttons. Presentation-only; it feeds the abstract control
	 * bridge, so gameplay logic is unchanged.
	 */

	interface Props {
		/** Pause the controls while a modal/panel is open. */
		disabled?: boolean;
	}
	let { disabled = false }: Props = $props();

	// ── Joystick ────────────────────────────────────────────────────────
	const MAX_RADIUS = 52;
	let stickX = $state(0);
	let stickY = $state(0);
	let active = $state(false);
	let originX = 0;
	let originY = 0;
	let pointerId: number | null = null;

	function onStickDown(e: PointerEvent) {
		if (disabled) return;
		active = true;
		pointerId = e.pointerId;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		originX = rect.left + rect.width / 2;
		originY = rect.top + rect.height / 2;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		updateStick(e);
	}

	function onStickMove(e: PointerEvent) {
		if (!active || e.pointerId !== pointerId) return;
		updateStick(e);
	}

	function updateStick(e: PointerEvent) {
		let dx = e.clientX - originX;
		let dy = e.clientY - originY;
		const len = Math.hypot(dx, dy);
		if (len > MAX_RADIUS) {
			dx = (dx / len) * MAX_RADIUS;
			dy = (dy / len) * MAX_RADIUS;
		}
		stickX = dx;
		stickY = dy;
		// Normalise by MAX_RADIUS so full deflection = full speed.
		setVirtualMove({ x: dx / MAX_RADIUS, y: dy / MAX_RADIUS });
	}

	function onStickUp(e: PointerEvent) {
		if (e.pointerId !== pointerId) return;
		active = false;
		pointerId = null;
		stickX = 0;
		stickY = 0;
		setVirtualMove({ x: 0, y: 0 });
	}

	// ── Action buttons ──────────────────────────────────────────────────
	function tap(action: InputAction) {
		if (disabled) return;
		virtualPress(action);
	}

	function holdOn(action: InputAction) {
		if (disabled) return;
		setVirtualHeld(action, true);
	}

	function holdOff(action: InputAction) {
		setVirtualHeld(action, false);
	}

	$effect(() => {
		// Release any held inputs when disabled.
		if (disabled) {
			setVirtualMove({ x: 0, y: 0 });
			setVirtualHeld('SPRINT', false);
			active = false;
			stickX = 0;
			stickY = 0;
		}
	});
</script>

<div class="mobile" class:disabled aria-hidden={disabled}>
	<!-- Movement joystick -->
	<button
		type="button"
		class="joystick"
		aria-label="Tuas gerak"
		onpointerdown={onStickDown}
		onpointermove={onStickMove}
		onpointerup={onStickUp}
		onpointercancel={onStickUp}
	>
		<div class="base"></div>
		<div class="stick" style="transform: translate({stickX}px, {stickY}px)"></div>
	</button>

	<!-- Action buttons -->
	<div class="actions">
		<button class="btn attack" onpointerdown={() => tap('ATTACK')} aria-label="Serang">⚔</button>
		<button class="btn heavy" onpointerdown={() => tap('HEAVY_ATTACK')} aria-label="Serangan berat"
			>💥</button
		>
		<button class="btn" onpointerdown={() => tap('INTERACT')} aria-label="Berinteraksi">✋</button>
		<button class="btn" onpointerdown={() => tap('DODGE')} aria-label="Menghindar">🌀</button>
		<button
			class="btn"
			onpointerdown={() => holdOn('SPRINT')}
			onpointerup={() => holdOff('SPRINT')}
			onpointercancel={() => holdOff('SPRINT')}
			onpointerleave={() => holdOff('SPRINT')}
			aria-label="Berlari">🏃</button
		>
		<button class="btn" onpointerdown={() => tap('BUILD')} aria-label="Bangun">🔨</button>
	</div>
</div>

<style>
	.mobile {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 40;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}
	.mobile.disabled {
		opacity: 0.35;
	}
	.joystick {
		position: absolute;
		left: max(16px, env(safe-area-inset-left));
		bottom: max(16px, env(safe-area-inset-bottom));
		width: 128px;
		height: 128px;
		padding: 0;
		border: none;
		background: transparent;
		pointer-events: auto;
		touch-action: none;
	}
	.base {
		position: absolute;
		inset: 24px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 30%, rgba(56, 81, 62, 0.6), rgba(20, 12, 6, 0.5));
		border: 3px solid var(--wood-dark);
		box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.45);
	}
	.stick {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 56px;
		height: 56px;
		margin: -28px 0 0 -28px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, var(--green-light), var(--green-dark));
		border: 3px solid var(--wood-dark);
		box-shadow: 0 4px 8px rgba(8, 18, 12, 0.5);
		transition: transform 0.05s linear;
	}
	.actions {
		position: absolute;
		right: max(16px, env(safe-area-inset-right));
		bottom: max(16px, env(safe-area-inset-bottom));
		display: grid;
		grid-template-columns: repeat(3, 56px);
		gap: 10px;
		pointer-events: auto;
	}
	.btn {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: 3px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-size: 1.3rem;
		display: grid;
		place-items: center;
		touch-action: none;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--wood-dark);
	}
	.btn:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 var(--wood-dark);
		filter: brightness(1.1);
	}
	.btn.attack {
		background: linear-gradient(180deg, #e88a86, #c05753);
	}
	.btn.heavy {
		background: linear-gradient(180deg, var(--amber), var(--amber-dark));
	}
</style>
