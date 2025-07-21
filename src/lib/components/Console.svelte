<script lang="ts">
	import { type Logger, logs, visible, filters } from '$lib/dicom/debugStore.js';
	import { onMount } from 'svelte';

	let filter: { level: string, category: string } = $state({ level: 'all', category: 'all' });
	let filtered: Logger[] = $state([]);

	onMount(() => {
		window.addEventListener('keydown', (e) => {
			if (e.key === '`') visible.update((v) => !v);
		});
	});

	$effect(() => {
		filters.set(filter);
		filtered = $logs.filter((log: Logger) => {
			const levelMatch = filter.level === 'all' || log.level === filter.level;
			const categoryMatch = filter.category === 'all' || log.category === filter.category;
			return levelMatch && categoryMatch;
		});
	});

	function copy(text: string) {
		navigator.clipboard.writeText(text);
	}

	function clear() {
		logs.set([]);
	}
</script>

{#if $visible}
	<div class="console">
		<div class="header">
			<span class="material-icons">bug_report</span>
			<span>Debug Console</span>
			<select bind:value={filter.level}>
				<option value="all">All Levels</option>
				<option value="info">Info</option>
				<option value="warn">Warn</option>
				<option value="error">Error</option>
				<option value="debug">Debug</option>
				<option value="success">Success</option>
			</select>
			<select bind:value={filter.category}>
				<option value="all">All Categories</option>
				{#each Array.from(new Set($logs.map((l: Logger) => l.category))) as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
			<button onclick={clear}>Clear</button>
		</div>
		<div class="loglist">
			{#each filtered as log}
				<details class="log {log.level}">
					<summary>
						<code>[{log.timestamp}]</code>
						<span class="category">{log.category}</span>
						<span class="level">[{log.level.toUpperCase()}]</span>
						<button class="copy" onclick={() => copy(log.text || '')}>📋</button>
					</summary>
					<pre>{log.text}</pre>
				</details>
			{/each}
		</div>
	</div>
{/if}

<style>
	.console {
		position: absolute;
		bottom: 0.6rem;
		left: 0.6rem;
		min-width: 500px;
		max-height: 50vh;
		background-color: rgba(0, 0, 0, 0.85);
		color: #0f0;
		font-family: monospace;
		font-size: 0.85rem;
		border: 1px solid #0f0;
		border-radius: 0.5rem;
		padding: 0.5rem;
		overflow-y: auto;
		z-index: 10000;
		pointer-events: all;
	}
	.console-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 1rem;
		font-weight: bold;
	}
	.console-body {
		overflow-y: auto;
	}
	.console-line {
		white-space: pre-wrap;
	}
	button {
		background: none;
		border: 1px solid #0f0;
		color: #0f0;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
	}
	.loglist {
		overflow-y: auto;
		flex-grow: 1;
	}
	details.log summary {
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		justify-content: space-between;
		background: rgba(0, 0, 0, 0.7);
		padding: 0.25rem;
		border-bottom: 1px solid #333;
	}
	details.log pre {
		background: rgba(0, 0, 0, 0.5);
		padding: 0.5rem;
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.log.info summary {
		color: rgb(239, 239, 239);
	}
	.log.warn summary {
		color: orange;
	}
	.log.error summary {
		color: red;
	}
	.log.debug summary {
		color: #0ff;
	}
	.log.success summary {
		color: #0f0;
	}
	button {
		cursor: pointer;
	}
	.copy {
		background: none;
		border: none;
		color: #0f0;
		font-size: 0.75rem;
		cursor: pointer;
	}
</style>
