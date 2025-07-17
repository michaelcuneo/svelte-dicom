<script lang="ts">
	import { onMount } from 'svelte';
	import { DICOMParser } from '$lib/dicom/DICOMParser.js';
	import { TRANSFER_SYNTAXES, type TransferSyntax } from '$lib/dicom/TransferSyntax.js';
	import { getElementKeyword } from '$lib/dicom/DICOMDictionary.js';

	let { files }: { files: FileList | null } = $props();

	let wrapper: HTMLDivElement | undefined = $state(undefined);
	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | undefined = $state(undefined);

	let debug: boolean = $state(true);

	let pixelBuffer: ImageData | null = $state(null);
	let width: number = 256;
	let height: number = 256;

	// State variables for zoom and pan
	let scale: number = $state(1.0);
	let offsetX: number = $state(0);
	let offsetY: number = $state(0);

	let isPanning: boolean = $state(false);
	let lastX: number = $state(0);
	let lasyY: number = $state(0);

	let imageBitmap: ImageBitmap | null = $state(null);
	let elements: Record<string, any> = $state([]);

	$effect(() => {
		if (files && files.length > 0) {
			loadDicomFile(files[0]);
		}
	});

	const loadDicomFile = async (file: File) => {
		const buffer = await file.arrayBuffer();
		const tmpParser = new DICOMParser(buffer); // use default syntax
		const meta = tmpParser.parseMeta();
		const transferSyntax: TransferSyntax = tmpParser.getTransferSyntaxFromMeta(meta);

		const parser = new DICOMParser(buffer, transferSyntax);

		elements = parser.parse();
		console.log(
			'Parsed elements:',
			elements.map((el) => el.tag)
		);

		// Search the raw buffer for 7FE0,0010 in little endian: e0 7f 10 00
		const bytes = new Uint8Array(buffer);
		for (let i = 0; i < bytes.length - 4; i++) {
			if (
				bytes[i] === 0xe0 &&
				bytes[i + 1] === 0x7f &&
				bytes[i + 2] === 0x10 &&
				bytes[i + 3] === 0x00
			) {
				console.log('Found Pixel Data marker at offset', i);
				break;
			}
		}

		// Assume 512x512 grayscale image starting at 1400
		const pixelStart = 1400 + 8; // skip tag and 4-byte length
		const pixelLength = 512 * 512;
		const pixelBytes = new Uint8Array(buffer, pixelStart, pixelLength);

		const imageData = new ImageData(512, 512);
		for (let i = 0; i < pixelBytes.length; i++) {
			const v = pixelBytes[i];
			imageData.data[i * 4 + 0] = v;
			imageData.data[i * 4 + 1] = v;
			imageData.data[i * 4 + 2] = v;
			imageData.data[i * 4 + 3] = 255;
		}

		pixelBuffer = imageData;
		width = 512;
		height = 512;
		fitToScreen();
		draw();

		/*
		const pixel = elements.find((el) => el.tag === '7FE0,0010');

		console.log('Transfer Syntax UID:', transferSyntax?.uid);
		console.log('Pixel tag:', pixel);

		if (pixel?.value instanceof Uint8Array) {
			console.warn('Uncompressed pixel data found — not yet handled');
		} else if (Array.isArray(pixel?.value)) {
			const fragment = pixel.value[0]?.elements?.[0]?.value;
			console.log('Fragment:', fragment);
			if (fragment instanceof Uint8Array) {
				const blob = new Blob([fragment], { type: 'image/jpeg' });
				imageBitmap = await createImageBitmap(blob);
				console.log('Decoded imageBitmap:', imageBitmap?.width, imageBitmap?.height);
				width = imageBitmap.width;
				height = imageBitmap.height;
				fitToScreen();
				draw();
			} else {
				console.warn('Invalid fragment type:', typeof fragment);
			}
		} else {
			console.warn('Unhandled pixel value format:', typeof pixel?.value);
		}
		*/
	};

	onMount(() => {
		// Initialize canvas and pixel buffer
		// Ensure canvas and wrapper are defined
		if (!wrapper || typeof window === 'undefined') return;

		// Set canvas dimensions to match the wrapper
		const buffer = new Uint8Array(width * height);
		const imageData = new ImageData(width, height);

		for (let i = 0; i < buffer.length; i++) {
			buffer[i] = Math.floor(Math.random() * 256); // Fill with random pixel values
		}

		for (let i = 0; i < width * height; i++) {
			const index = buffer[i];
			imageData.data[i * 4] = index; // Red
			imageData.data[i * 4 + 1] = index; // Green
			imageData.data[i * 4 + 2] = index; // Blue
			imageData.data[i * 4 + 3] = 255; // Alpha
		}

		const resize = new ResizeObserver(() => draw());
		resize.observe(wrapper);

		draw();
	});

	const draw = () => {
		if (typeof window === 'undefined' || !canvas || !wrapper) return;

		const ctx = canvas?.getContext('2d');
		if (!ctx) return;

		const { width, height } = wrapper?.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		ctx.save();
		ctx.clearRect(0, 0, width, height);
		ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
		if (imageBitmap) {
			ctx.drawImage(imageBitmap, 0, 0);
		} else if (pixelBuffer) {
			ctx.putImageData(pixelBuffer, 0, 0);
		}
		ctx.restore();

		console.log('Draw called. ImageBitmap:', !!imageBitmap);
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();

		const delta = -event.deltaY * 0.001; // Adjust zoom sensitivity
		const factor = Math.exp(delta);

		const rect = canvas?.getBoundingClientRect();
		const x = event.clientX - (rect?.left || 0);
		const y = event.clientY - (rect?.top || 0);

		const newScale = scale * factor;

		offsetX = x - (x - offsetX) * (newScale / scale);
		offsetY = y - (y - offsetY) * (newScale / scale);
		scale = newScale;

		draw();
	};

	const onPointerDown = (event: PointerEvent) => {
		if (!wrapper) return;

		isPanning = true;
		lastX = event.clientX;
		lasyY = event.clientY;
		wrapper.setPointerCapture(event.pointerId);
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!wrapper || !isPanning) return;
		offsetX += event.clientX - lastX;
		offsetY += event.clientY - lasyY;
		lastX = event.clientX;
		lasyY = event.clientY;

		draw();
	};

	const onPointerUp = (event: PointerEvent) => {
		if (!wrapper) return;
		isPanning = false;
		wrapper.releasePointerCapture(event.pointerId);
	};

	const zoomIn = () => {
		scale *= 1.1; // Increase scale by 10%
		draw();
	};

	const zoomOut = () => {
		scale /= 1.1; // Decrease scale by 10%
		draw();
	};

	const resetView = () => {
		scale = 1.0;
		offsetX = 0;
		offsetY = 0;
		draw();
	};

	const fitToScreen = () => {
		const bounds = wrapper?.getBoundingClientRect();
		if (!bounds) return;
		const scaleX = bounds.width / width;
		const scaleY = bounds.height / height;
		scale = Math.min(scaleX || 1, scaleY || 1);
		offsetX = (bounds.width - width * scale) / 2 || 0;
		offsetY = (bounds.height - height * scale) / 2 || 0;

		draw();
	};
</script>

<svelte:window
	on:resize={() => {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	}}
/>

<div
	class="view-wrapper"
	bind:this={wrapper}
	onwheel={onWheel}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointerleave={onPointerUp}
	style={debug ? 'outline: 1px solid red;' : ''}
>
	<canvas bind:this={canvas}> Your browser does not support the HTML5 canvas tag. </canvas>
	<div class="controls">
		<button onclick={zoomIn}>Zoom In</button>
		<button onclick={zoomOut}>Zoom Out</button>
		<button onclick={resetView}>Reset View</button>
		<button onclick={fitToScreen}>Fit to Screen</button>
	</div>
</div>

<style>
	.view-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: black;
		touch-action: none;
	}
	canvas {
		display: block;
		image-rendering: pixelated;
		width: 100%;
		height: 100%;
	}
	.controls {
		display: flex;
		position: absolute;
		top: 10px;
		left: 10px;
		gap: 6px;
		z-index: 10;
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
