import { ACTION_BINDINGS, type InputAction } from './actions';

/**
 * Human-readable controls reference (see §55, Phase 15).
 *
 * Derived entirely from {@link ACTION_BINDINGS} so the in-game help can never
 * drift from the real key mapping. Pure data — no Phaser, no Svelte.
 */

export interface ControlBinding {
	/** The abstract action these keys perform. */
	action: InputAction;
	/** Localised-ish label for what the action does. */
	label: string;
	/** Keys that trigger it, formatted for display (e.g. "W", "Shift", "1–5"). */
	keys: string;
}

/** Display labels per action (Indonesian, matching the rest of the UI). */
const ACTION_LABELS: Record<InputAction, string> = {
	MOVE_UP: 'Jalan ke atas',
	MOVE_DOWN: 'Jalan ke bawah',
	MOVE_LEFT: 'Jalan ke kiri',
	MOVE_RIGHT: 'Jalan ke kanan',
	SPRINT: 'Berlari',
	INTERACT: 'Berinteraksi',
	ATTACK: 'Serangan ringan',
	HEAVY_ATTACK: 'Serangan berat',
	BLOCK: 'Menangkis',
	DODGE: 'Menghindar',
	INVENTORY: 'Tas',
	CRAFTING: 'Meracik',
	BUILD: 'Membangun',
	ROTATE: 'Memutar bangunan',
	QUESTS: 'Jurnal misi',
	MAP: 'Peta',
	PAUSE: 'Jeda',
	HOTBAR_1: 'Slot cepat',
	HOTBAR_2: 'Slot cepat',
	HOTBAR_3: 'Slot cepat',
	HOTBAR_4: 'Slot cepat',
	HOTBAR_5: 'Slot cepat'
};

/** Pretty-print a raw keyboard event key for the help panel. */
export function formatKey(key: string): string {
	switch (key) {
		case ' ':
			return 'Spasi';
		case 'arrowup':
			return '↑';
		case 'arrowdown':
			return '↓';
		case 'arrowleft':
			return '←';
		case 'arrowright':
			return '→';
		case 'shift':
			return 'Shift';
		case 'escape':
			return 'Esc';
		default:
			return key.length === 1 ? key.toUpperCase() : key;
	}
}

/** Actions that share a "1–5" range presentation in the help panel. */
const HOTBAR_ACTIONS = new Set<InputAction>([
	'HOTBAR_1',
	'HOTBAR_2',
	'HOTBAR_3',
	'HOTBAR_4',
	'HOTBAR_5'
]);

/**
 * Build the ordered, de-duplicated controls reference from the live bindings.
 * Arrow-key aliases are folded into their primary (WASD) entry so the panel
 * stays compact, and the hotbar slots collapse into a single "1–5" row.
 */
export function buildControlsReference(): ControlBinding[] {
	// action -> list of keys, in binding declaration order.
	const keysByAction = new Map<InputAction, string[]>();
	for (const [key, action] of Object.entries(ACTION_BINDINGS)) {
		const list = keysByAction.get(action) ?? [];
		list.push(key);
		keysByAction.set(action, list);
	}

	// Collapse the hotbar into one row, then emit the rest in the order their
	// primary binding first appears.
	const out: ControlBinding[] = [];
	let hotbarEmitted = false;
	const seen = new Set<InputAction>();

	for (const action of Object.values(ACTION_BINDINGS)) {
		if (seen.has(action)) continue;
		seen.add(action);
		if (HOTBAR_ACTIONS.has(action)) {
			if (hotbarEmitted) continue;
			hotbarEmitted = true;
			out.push({ action: 'HOTBAR_1', label: ACTION_LABELS.HOTBAR_1, keys: '1–5' });
			continue;
		}
		const keys = (keysByAction.get(action) ?? []).map(formatKey);
		out.push({ action, label: ACTION_LABELS[action], keys: keys.join(' / ') });
	}
	return out;
}
