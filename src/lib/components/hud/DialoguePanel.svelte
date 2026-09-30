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
		<div class="box">
			<header>
				<div>
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
						<button onclick={() => choose(choice.next, choice.questId)}>{choice.text}</button>
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
		background: #141c2e;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 14px;
		padding: 16px;
		width: min(620px, 100%);
		color: #f7fafc;
		font-family: var(--font-ui);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 10px;
	}
	.name {
		font-weight: 700;
		font-size: 1.05rem;
	}
	.role {
		display: block;
		font-size: 0.72rem;
		opacity: 0.6;
	}
	.close {
		background: transparent;
		border: none;
		color: inherit;
		font-size: 1.1rem;
		cursor: pointer;
	}
	.lines p {
		margin: 0 0 6px;
		line-height: 1.45;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 12px;
	}
	.choices button {
		text-align: left;
		padding: 9px 12px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
		color: #f7fafc;
		cursor: pointer;
		font-family: inherit;
	}
	.choices button:hover {
		background: rgba(104, 211, 145, 0.18);
		border-color: #68d391;
	}
</style>
