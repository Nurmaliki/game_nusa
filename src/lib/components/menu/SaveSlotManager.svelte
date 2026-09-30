<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { getGameBus } from '$game/core/event-bus';
	import * as repo from '$game/save/repository';
	import { getGameSession } from '$stores/game-session.svelte';
	import type { SaveSlotMeta } from '$types/save';

	/**
	 * Save-slot manager (Phase 11). Lets the player continue, inspect, delete,
	 * restore a backup, and import/export slots — all with corruption feedback.
	 */
	interface Props {
		slots: SaveSlotMeta[];
		onChanged: () => void;
	}
	let { slots, onChanged }: Props = $props();

	const session = getGameSession();
	let busy = $state(false);
	let message = $state<{ text: string; kind: 'info' | 'warning' } | null>(null);
	let fileInput: HTMLInputElement | null = $state(null);

	function notify(text: string, kind: 'info' | 'warning' = 'info'): void {
		message = { text, kind };
		setTimeout(() => (message = null), 3200);
	}

	async function continueSlot(saveId: string): Promise<void> {
		busy = true;
		const r = await session.loadSlot(saveId);
		busy = false;
		if (r.ok) goto(resolve('/play'));
		else notify('Gagal memuat save.', 'warning');
	}

	async function deleteSlot(saveId: string): Promise<void> {
		busy = true;
		await repo.deleteSave(saveId);
		busy = false;
		onChanged();
		notify('Slot dihapus.');
	}

	async function restore(saveId: string): Promise<void> {
		busy = true;
		const restored = await session.restoreBackup(saveId);
		busy = false;
		if (restored) {
			onChanged();
			notify('Cadangan terakhir dipulihkan.');
		} else {
			notify('Tidak ada cadangan untuk slot ini.', 'warning');
		}
	}

	async function inspectSlot(saveId: string): Promise<void> {
		const info = await session.inspect(saveId);
		notify(
			info.valid
				? `OK · ${info.backups} cadangan`
				: `Rusak (${info.error ?? 'tidak diketahui'}) · ${info.backups} cadangan`,
			info.valid ? 'info' : 'warning'
		);
	}

	async function exportSlot(saveId: string): Promise<void> {
		const save = await repo.getSave(saveId);
		if (!save) return notify('Slot tidak ditemukan.', 'warning');
		const blob = repo.exportSaveBlob(save, Date.now());
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `nusantara-${saveId}.json`;
		a.click();
		URL.revokeObjectURL(url);
		notify('Save diekspor.');
	}

	function pickImport(): void {
		fileInput?.click();
	}

	async function onImportFile(e: Event): Promise<void> {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = true;
		const text = await file.text();
		const r = session.importFromText(text);
		busy = false;
		if (r.ok) {
			getGameBus().emit('TOAST', { text: 'Save diimpor.', kind: 'success' });
			goto(resolve('/play'));
		} else {
			notify(`Impor gagal: ${r.error ?? 'tidak valid'}`, 'warning');
		}
	}

	function formatDate(ms: number): string {
		return new Date(ms).toLocaleString();
	}
</script>

<section class="slots">
	<div class="head">
		<h2>Slot Tersimpan</h2>
		<button class="ghost" onclick={pickImport} disabled={busy}>Impor…</button>
	</div>

	{#if message}
		<p class="msg" class:warning={message.kind === 'warning'}>{message.text}</p>
	{/if}

	{#if slots.length === 0}
		<p class="empty">Belum ada save. Mulai game baru untuk menyimpan.</p>
	{:else}
		<ul>
			{#each slots as slot (slot.saveId)}
				<li>
					<div class="meta">
						<strong>{slot.summary}</strong>
						<span class="sub">v{slot.gameVersion} · schema {slot.schemaVersion}</span>
						<span class="sub">{formatDate(slot.updatedAt)}</span>
					</div>
					<div class="actions">
						<button class="primary" onclick={() => continueSlot(slot.saveId)} disabled={busy}>
							Lanjut
						</button>
						<button onclick={() => inspectSlot(slot.saveId)} disabled={busy}>Cek</button>
						<button onclick={() => restore(slot.saveId)} disabled={busy}>Pulihkan</button>
						<button onclick={() => exportSlot(slot.saveId)} disabled={busy}>Ekspor</button>
						<button class="danger" onclick={() => deleteSlot(slot.saveId)} disabled={busy}>
							Hapus
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<input
		type="file"
		accept="application/json,.json"
		class="hidden-file"
		bind:this={fileInput}
		onchange={onImportFile}
	/>
</section>

<style>
	.slots {
		margin-top: 24px;
		text-align: left;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h2 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.7;
		margin: 0 0 10px;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 10px 12px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 140px;
	}
	.sub {
		font-size: 0.72rem;
		opacity: 0.6;
	}
	.actions {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.actions button,
	button.ghost {
		padding: 6px 10px;
		font-size: 0.8rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.06);
		color: inherit;
		cursor: pointer;
	}
	button.primary {
		background: #38a169;
		border-color: #38a169;
		font-weight: 700;
	}
	button.danger {
		border-color: rgba(229, 62, 62, 0.5);
		color: #feb2b2;
	}
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.empty {
		opacity: 0.6;
		font-size: 0.9rem;
	}
	.msg {
		font-size: 0.82rem;
		margin: 0 0 10px;
		color: #9ae6b4;
	}
	.msg.warning {
		color: #fbd38d;
	}
	.hidden-file {
		display: none;
	}
</style>
