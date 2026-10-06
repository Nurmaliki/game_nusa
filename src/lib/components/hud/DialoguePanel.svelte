<script lang="ts">
	import { getGameBus } from '$game/core/event-bus';
	import { getGameSession } from '$stores/game-session.svelte';
	import { getNpc, type DialogueNode } from '$data/npcs';
	import { getQuest } from '$data/quests';

	interface OpenPayload {
		npcId: string;
		npcName: string;
		role: string;
		nodeId: string;
	}

	let open = $state<OpenPayload | null>(null);
	let node = $state<DialogueNode | null>(null);
	const session = getGameSession();

	$effect(() => {
		const bus = getGameBus();
		const offOpen = bus.on('DIALOGUE_OPENED', (p) => {
			open = p;
			node = getNpc(p.npcId)?.dialogue[p.nodeId] ?? null;
		});
		return offOpen;
	});

	function choose(next: string | null, questId?: string) {
		const state = session.state;
		if (state && questId) {
			// Accept or advance a quest offered by this dialogue.
			const progress = state.quests.get(questId);
			if (progress?.state === 'AVAILABLE') {
				state.acceptQuest(questId);
				getGameBus().emit('TOAST', {
					text: `Misi diterima: ${getQuest(questId)?.name}`,
					kind: 'info'
				});
			}
			getGameBus().emit('QUEST_UPDATED_UI', { revision: Date.now() });
		}
		if (next && open) {
			node = getNpc(open.npcId)?.dialogue[next] ?? null;
		} else {
			close();
		}
	}

	function close() {
		open = null;
		node = null;
		getGameBus().emit('DIALOGUE_CLOSED', undefined);
	}

	function canShow(choice: { requires?: { questId: string; state: string } }): boolean {
		if (!choice.requires) return true;
		const state = session.state;
		if (!state) return true;
		return state.quests.state(choice.requires.questId) === choice.requires.state;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}}
/>

{#if open && node}
	<div class="overlay" role="dialog" aria-label="Dialog {open.npcName}">
		<div class="box u-panel">
			<header>
				<span class="avatar" aria-hidden="true">{open.npcName.slice(0, 1).toUpperCase()}</span>
				<div class="who">
					<span class="name">{open.npcName}</span>
					<span class="role">{open.role}</span>
				</div>
				<button class="close" onclick={close} aria-label="Tutup">✕</button>
			</header>
			<div class="lines">
				{#each node.lines as line, i (i)}
					<p>{line}</p>
				{/each}
			</div>
			<div class="choices">
				{#each node.choices as choice, i (i)}
					{#if canShow(choice)}
						<button onclick={() => choose(choice.next, choice.questId)}>
							<span class="bullet">›</span>{choice.text}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: 52;
		padding: 16px;
		pointer-events: none;
	}
	.box {
		pointer-events: auto;
		padding: 16px 18px;
		width: min(640px, 100%);
		animation: rise 0.22s ease;
	}
	@keyframes rise {
		from {
			transform: translateY(16px);
			opacity: 0;
		}
	}
	header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
		padding-bottom: 10px;
		border-bottom: 2px dashed rgba(247, 241, 227, 0.14);
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-pill);
		background: linear-gradient(180deg, var(--sky), #4a8fc0);
		border: 2px solid var(--wood-dark);
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.3rem;
		color: #12222e;
	}
	.who {
		flex: 1;
	}
	.name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.1rem;
	}
	.role {
		display: block;
		font-size: 0.74rem;
		color: var(--ink-muted);
	}
	.close {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--wood-dark);
		background: linear-gradient(180deg, var(--wood-light), var(--wood));
		color: var(--ink);
		font-weight: 800;
		cursor: pointer;
	}
	.lines p {
		margin: 0 0 8px;
		line-height: 1.55;
		color: var(--ink-soft);
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 14px;
	}
	.choices button {
		display: flex;
		align-items: center;
		gap: 8px;
		text-align: left;
		padding: 10px 14px;
		border-radius: var(--radius);
		border: 2px solid var(--border-warm);
		background: linear-gradient(180deg, rgba(247, 241, 227, 0.06), rgba(20, 12, 6, 0.2));
		color: var(--ink);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9rem;
		transition:
			transform 0.08s ease,
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.choices button:hover {
		background: linear-gradient(180deg, rgba(107, 191, 90, 0.24), rgba(20, 12, 6, 0.2));
		border-color: var(--green);
		transform: translateX(3px);
	}
	.bullet {
		color: var(--green-light);
		font-weight: 800;
	}
</style>
