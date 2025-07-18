<script lang="ts">
	let {
		zoomIn = $bindable(),
		zoomOut = $bindable(),
		resetView = $bindable(),
		fitToScreen = $bindable(),
		showMetadata = $bindable(false)
	}: {
		zoomIn: () => void;
		zoomOut: () => void;
		resetView: () => void;
		fitToScreen: () => void;
		showMetadata: boolean;
	} = $props();
</script>

<div class="controls">
	<button onclick={zoomIn}><span class="material-icons">add</span></button>
	<button onclick={zoomOut}><span class="material-icons">remove</span></button>
	<button onclick={resetView}><span class="material-icons">aspect_ratio</span></button>
	<button onclick={fitToScreen}><span class="material-icons">fit_screen</span></button>
	<button onclick={() => (showMetadata = !showMetadata)}>
		<span class="material-icons">info</span>
	</button>
</div>

<style>
	.controls {
		display: flex;
		position: relative;
		gap: 6px;
	}
	.controls button {
		padding: 4px 8px;
		font-size: 0.9rem;
		border-radius: 4px;
		border: none;
		background-color: #fff;
		cursor: pointer;
	}
	.controls button:hover {
		background-color: #ddd;
	}
</style>
