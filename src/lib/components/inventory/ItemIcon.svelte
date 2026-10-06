<script lang="ts">
	import { itemIcon, rarityBorder } from '$game/core/item-icons';
	import { getItem } from '$data/items';

	/**
	 * A single item icon tile: a rarity-framed, warmly tinted rounded square
	 * showing the item's glyph. Shared by the hotbar, inventory and any panel
	 * that lists items, so icons stay consistent everywhere.
	 */
	interface Props {
		id: string;
		size?: number;
		/** Optional explicit rarity override (defaults to the item's own). */
		rarity?: string;
		/** Dim the tile (e.g. an unaffordable recipe ingredient). */
		dim?: boolean;
	}
	let { id, size = 32, rarity, dim = false }: Props = $props();

	const def = $derived(getItem(id));
	const icon = $derived(itemIcon(def, id));
	const border = $derived(rarityBorder(rarity ?? def?.rarity));
</script>

<span
	class="item-icon"
	class:dim
	style="--s:{size}px; --tint:{icon.tint}; --frame:{border}"
	aria-hidden="true"
>
	<span class="glyph">{icon.glyph}</span>
</span>

<style>
	.item-icon {
		display: inline-grid;
		place-items: center;
		width: var(--s);
		height: var(--s);
		flex: 0 0 auto;
		border-radius: calc(var(--s) * 0.28);
		background:
			radial-gradient(circle at 35% 25%, rgba(247, 241, 227, 0.28), transparent 60%),
			linear-gradient(180deg, color-mix(in srgb, var(--tint) 78%, white), var(--tint));
		border: 2px solid var(--frame);
		box-shadow:
			inset 0 -3px 0 rgba(20, 12, 6, 0.3),
			0 2px 4px rgba(8, 18, 12, 0.35);
	}
	.item-icon.dim {
		filter: grayscale(0.7) brightness(0.8);
		opacity: 0.65;
	}
	.glyph {
		font-size: calc(var(--s) * 0.56);
		line-height: 1;
		filter: drop-shadow(0 1px 1px rgba(20, 12, 6, 0.45));
	}
</style>
