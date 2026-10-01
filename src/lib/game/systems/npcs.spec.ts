import { describe, it, expect } from 'vitest';
import { NpcRegistry, relationshipTier } from './npcs';
import { getNpc, npcPositionAt } from '$data/npcs';

describe('relationshipTier', () => {
	it('maps relationship values to tiers', () => {
		expect(relationshipTier(0)).toBe('stranger');
		expect(relationshipTier(1)).toBe('acquaintance');
		expect(relationshipTier(3)).toBe('friend');
		expect(relationshipTier(6)).toBe('ally');
	});
});

describe('NpcRegistry', () => {
	it('creates one runtime per NPC, un-met and neutral', () => {
		const reg = new NpcRegistry();
		expect(reg.all().length).toBeGreaterThan(0);
		for (const n of reg.all()) {
			expect(n.met).toBe(false);
			expect(n.relationship).toBe(0);
		}
	});

	it('places anchors deterministically from the world size', () => {
		const reg = new NpcRegistry();
		reg.placeAnchors(4000, 3000);
		const def = getNpc('nelayan')!;
		const runtime = reg.get('nelayan')!;
		expect(runtime.anchor.x).toBeCloseTo(4000 / 2 + def.anchor.x * 4000, 5);
		expect(runtime.anchor.y).toBeCloseTo(3000 / 2 + def.anchor.y * 3000, 5);
	});

	it('records talking to an NPC', () => {
		const reg = new NpcRegistry();
		reg.talk('nelayan', 'nelayan_root');
		const n = reg.get('nelayan')!;
		expect(n.met).toBe(true);
		expect(n.lastDialogueId).toBe('nelayan_root');
	});

	it('adds relationship and clamps at zero', () => {
		const reg = new NpcRegistry();
		expect(reg.addRelationship('nelayan', 3)).toBe(3);
		expect(reg.addRelationship('nelayan', -10)).toBe(0);
	});

	it('resolves scheduled position by hour', () => {
		const reg = new NpcRegistry();
		reg.placeAnchors(4000, 3000);
		const morning = reg.positionAt('nelayan', 5);
		const afternoon = reg.positionAt('nelayan', 9);
		expect(afternoon.x).not.toBe(morning.x);
	});

	it('reports activity labels', () => {
		const reg = new NpcRegistry();
		reg.placeAnchors(4000, 3000);
		expect(reg.activityAt('nelayan', 9)).toBe('memancing');
	});

	it('serialize/deserialize round-trips relationship + met', () => {
		const reg = new NpcRegistry();
		reg.talk('penjaga_hutan', 'sari_root');
		reg.addRelationship('penjaga_hutan', 4);
		const data = reg.serialize();
		const reg2 = new NpcRegistry();
		reg2.deserialize(data);
		expect(reg2.get('penjaga_hutan')!.relationship).toBe(4);
		expect(reg2.get('penjaga_hutan')!.met).toBe(true);
	});
});

describe('npcPositionAt', () => {
	it('applies the schedule offset for the hour', () => {
		const def = getNpc('nelayan')!;
		const pos = npcPositionAt(def, { x: 100, y: 100 }, 9);
		expect(pos.activity).toBe('memancing');
		expect(pos.x).toBe(100 - 120);
	});
});

describe('NpcRegistry edge cases', () => {
	it('returns safe defaults for unknown ids', () => {
		const reg = new NpcRegistry();
		expect(reg.addRelationship('ghost', 5)).toBe(0);
		expect(reg.positionAt('ghost', 9)).toEqual({ x: 0, y: 0 });
		expect(reg.activityAt('ghost', 9)).toBeNull();
	});

	it('finds the nearest NPC within range and excludes distant ones', () => {
		const reg = new NpcRegistry();
		reg.placeAnchors(4000, 3000);
		// Ask from a point near the nelayan anchor (placed at the coast).
		const near = reg.nearest(
			{ x: reg.get('nelayan')!.anchor.x, y: reg.get('nelayan')!.anchor.y },
			500,
			9
		);
		expect(near?.def.id).toBe('nelayan');
		// A tiny range from far away yields nobody.
		expect(reg.nearest({ x: -99999, y: -99999 }, 10, 9)).toBeNull();
	});
});
