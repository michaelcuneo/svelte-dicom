<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let width: number = $state(800);
	let height: number = $state(600);

	onMount(() => {
		if (!canvas) {
			console.error('Canvas element is not bound');
			return;
		}

		// Set canvas dimensions to fill the window
		canvas.width = width;
		canvas.height = height;

		// Example drawing logic
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error('Failed to get canvas context');
			return;
		}
		ctx.drawImage(canvas, 0, 0);
		ctx.fillStyle = 'lightblue';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.font = '20px Arial';
		ctx.fillStyle = 'black';
		ctx.fillText('Hello, DICOM!', 10, 50);
		ctx.strokeStyle = 'black';
		ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
		ctx.fillText('This is a DICOM viewer placeholder.', 10, 80);
		ctx.fillText('Replace this with actual DICOM rendering logic.', 10, 110);
		ctx.fillText('For now, this is just a placeholder.', 10, 140);
	});
</script>

<svelte:window
	on:resize={() => {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	}}
	bind:innerWidth={width}
	bind:innerHeight={height}
/>

<div class="dicom-viewer">
	<canvas bind:this={canvas} width="800" height="600">
		Your browser does not support the HTML5 canvas tag.
	</canvas>
</div>

<style>
	.dicom-viewer {
		width: 100%;
		height: 100%;
		padding: 0px;
		margin: 0px;
	}
</style>
