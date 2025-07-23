<script lang="ts">
	import Dicom from '$lib/components/DicomViewer.svelte';
</script>

<div class="main">
	<h1>Svelte Dicom Viewer Example</h1>
	<div class="dicom-viewer">
		<Dicom enableConsole={true} enableOverlay={true} height={800} width={1200} />
	</div>
</div>

<style>
	.main {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100vw;
		min-height: 100vh;
		background-color: var(--color-background);
		color: var(--color-text);
	}
	.dicom-viewer {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		height: 100%;
		border-radius: 8px;
		box-shadow: 0 2px 10px var(--color-shadow);
	}
</style>
