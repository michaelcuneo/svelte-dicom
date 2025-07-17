<script lang="ts">
	let file = $state<File | null>(null);
	let files = $state<FileList | null>(null);
	import Dicom from '$lib/components/DicomViewer.svelte';
</script>

<input
	type="file"
	accept=".dcm"
	onchange={(e) => {
		// Add file to the files list
		const target = e.target as HTMLInputElement;
		files = target.files;
		if (files) {
			file = files[0]; // Get the first file
		} else {
			file = null; // Reset if no files selected
		}
	}}
/>
<Dicom {files} />
