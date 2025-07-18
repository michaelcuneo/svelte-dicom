<script lang="ts">
	import { onMount } from 'svelte';
	import { DICOMParser } from '$lib/dicom/DICOMParser.js';
	import { loadPixelData, type PixelInfo } from '$lib/dicom/loadPixelData.js';
	import Console from './Console.svelte';
	import Metadata from './Metadata.svelte';
	import Controls from './Controls.svelte';

	import { logs, visible, debugLog } from '$lib/dicom/debugStore.js';

	let file: File | null = $state<File | null>(null);
	let files: FileList | null = $state<FileList | null>(null);
	let showMetadata: boolean = $state(false);

	let wrapper: HTMLDivElement | undefined = $state(undefined);
	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | null = $state(null);

	let width: number = $state(256);
	let height: number = $state(256);

	// State variables for zoom and pan
	let scale: number = $state(1.0);
	let offsetX: number = $state(0);
	let offsetY: number = $state(0);

	let isPanning: boolean = $state(false);
	let lastX: number = $state(0);
	let lasyY: number = $state(0);

	let lastDrawWidth: number = $state(0);
	let lastDrawHeight: number = $state(0);

	let imageBitmap: ImageBitmap | null = $state(null);
	let elements: Array<{ tag: string; value: any }> = $state([]);
	let pixelInfo: PixelInfo | null = $state(null);
	let currentFrame: number = $state(0);

	$effect(() => {
		if (files && files.length > 0) {
			loadDicomFile(files[0]);
		}

		requestAnimationFrame(() => {
			fitToScreen();
		});
	});

	const loadDicomFile = async (file: File) => {
		debugLog(`Loading DICOM file: ${file.name}`, { level: 'info' });
		const buffer = await file.arrayBuffer();

		debugLog(`File size: ${buffer.byteLength} bytes`, { level: 'info' });
		// Step 1: Parse file meta header (group 0002)
		const metaParser = new DICOMParser(buffer);
		const meta = metaParser.parseMeta();
		const transferSyntax = metaParser.getTransferSyntaxFromMeta(meta);
		const datasetOffset = metaParser.getOffset();

		debugLog(`Transfer Syntax UID: ${transferSyntax.uid}`, { level: 'info' });
		if (!datasetOffset) {
			debugLog('No dataset offset found, using default 128', 'warn');
		}

		// Step 2: Parse the dataset from proper offset
		const parser = new DICOMParser(buffer, transferSyntax);
		parser.byteStream.seek(datasetOffset);
		debugLog(`Parsing DICOM dataset at offset: ${datasetOffset}`, 'info');
		elements = parser.parse();

		// Step 3: Load pixel data (handles uncompressed, JPEG, color, etc.)
		debugLog(`Loading pixel data for ${elements.length} elements`, 'info');
		pixelInfo = await loadPixelData(buffer, elements, transferSyntax.uid);
		currentFrame = 0;

		if (pixelInfo) {
			debugLog(`Pixel data loaded: ${pixelInfo.bitmaps.length} bitmaps`, 'info');
		} else {
			debugLog('No pixel data found', 'error');
		}

		// Step 4: Assign imageBitmap and trigger draw
		if (pixelInfo?.bitmaps?.[0]) {
			imageBitmap = pixelInfo.bitmaps[0];
			width = pixelInfo.width;
			height = pixelInfo.height;
			fitToScreen();
			draw();
		} else {
			console.warn('No pixel data could be extracted.');
		}
	};

	onMount(() => {
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

		return () => resize.disconnect();
	});

	const draw = () => {
		if (!canvas || !wrapper) return;

		const bounds = wrapper.getBoundingClientRect();
		const w = Math.floor(bounds.width);
		const h = Math.floor(bounds.height);

		if (w === lastDrawWidth && h === lastDrawHeight) return;
		lastDrawWidth = w;
		lastDrawHeight = h;

		debugLog(`Drawing canvas at ${w}x${h} with scale ${scale}`, { level: 'info' });

		const dpr = window.devicePixelRatio || 1;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;

		ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);

		ctx.save();
		ctx.clearRect(0, 0, w, h);
		ctx.translate(offsetX, offsetY);
		ctx.scale(scale, scale);

		if (imageBitmap) {
			ctx.drawImage(imageBitmap, 0, 0);
		}

		ctx.restore();
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

<div class="viewer-container">
	<div class="main-view">
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
		<Controls {zoomIn} {zoomOut} {resetView} {fitToScreen} {showMetadata} />
		<div
			class="view-wrapper"
			bind:this={wrapper}
			onwheel={onWheel}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointerleave={onPointerUp}
		>
			<canvas bind:this={canvas}> Your browser does not support the HTML5 canvas tag. </canvas>
			<p class="overlay">
				Zoom: {scale.toFixed(2)}, Pan: ({offsetX}, {offsetY})
			</p>
		</div>
	</div>
	{#if showMetadata}<Metadata {elements} />{/if}
	<Console {logs} {visible} />
</div>

<style>
	.viewer-container {
		display: flex;
		flex-direction: column;
	}
	.main-view {
		display: flex;
		flex: 1;
		position: relative;
		flex-direction: column;
	}
	.view-wrapper {
		position: relative;
		flex: 1;
		background: black;
		touch-action: none;
	}
	canvas {
		display: block;
		image-rendering: pixelated;
		width: 100%;
		height: 100%;
		z-index: 1;
	}
	.overlay {
		color: white;
		position: absolute;
		font-size: 0.8rem;
		font-family: 'monospace';
		bottom: 10px;
		left: 10px;
	}
</style>
