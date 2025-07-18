<script lang="ts">
	import Dicom from '$lib/components/DicomViewer.svelte';
</script>

<div class="dicom-viewer">
	<Dicom />
</div>

<style>
	.dicom-viewer {
		display: flex;
		flex-direction: column;
		width: 100vw;
		height: 100vh;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}
</style>
