<script lang="ts">
	import '@fontsource/material-icons';
	import './styles.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

{@render children?.()}
