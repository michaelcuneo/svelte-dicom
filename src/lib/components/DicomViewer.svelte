<script lang="ts">
	import { onMount } from 'svelte';
	import { DICOMParser } from '$lib/dicom/DICOMParser.js';
	import { loadPixelData, type PixelInfo } from '$lib/dicom/loadPixelData.js';
	import Console from './Console.svelte';
	import Metadata from './Metadata.svelte';
	import Controls from './Controls.svelte';
	import Validate from './ValidateDicom.svelte';

	import { logs, visible, debugLog } from '$lib/dicom/debugStore.js';
	import FileDropper from './FileDropper.svelte';

	let {
		console = $bindable(false),
		overlay = $bindable(false),
		height = 600,
		width = 800
	}: {
		console?: boolean;
		overlay?: boolean;
		height?: number;
		width?: number;
	} = $props();

	let files: FileList | null = $state<FileList | null>(null);
	let showMetadata: boolean = $state(false);

	let wrapper: HTMLDivElement | undefined = $state(undefined);
	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | null = $state(null);

	let scale: number = $state(1.0);
	let offsetX: number = $state(0);
	let offsetY: number = $state(0);

	let isPanning: boolean = $state(false);
	let lastX: number = $state(0);
	let lastY: number = $state(0);

	let lastDrawWidth: number = $state(0);
	let lastDrawHeight: number = $state(0);

	let imageBitmap: ImageBitmap | null = $state(null);
	let elements: Array<{ tag: string; value: any }> = $state([]);
	let pixelInfo: PixelInfo | null = $state(null);
	let currentFrame: number = $state(0);

	let activeTab: 'upload' | 'viewer' | 'metadata' = $state('upload');

	$effect(() => {
		if (files && files.length > 0 && !pixelInfo) {
			loadDicomFile(files[0]);
		}
		if (activeTab === 'viewer' && pixelInfo) {
			imageBitmap = pixelInfo.bitmaps[currentFrame];
			draw();
		}
	});

	const loadDicomFile = async (file: File) => {
		// Loading the DICOM file.
		debugLog(`Loading DICOM file: ${file.name}`, { level: 'info', category: 'parse'});
		const buffer = await file.arrayBuffer();
		// Log file size and initial metadata
		debugLog(`File loaded: ${file.name}`, { level: 'info' });
		debugLog(`Buffer size: ${buffer.byteLength} bytes`, { level: 'info', category: 'parse' });
		// Step 1: Parse file meta header (group 0002)
		debugLog('Parsing DICOM meta header', { level: 'info', category: 'parse' });
		
		// Create a new parser for the meta header
		const metaParser = new DICOMParser(buffer);
		const meta = metaParser.parseMeta();
		const transferSyntax = metaParser.getTransferSyntaxFromMeta(meta);
		const datasetOffset = metaParser.getOffset();

		// Step 2: Parse the DICOM dataset
		debugLog(`Parsing DICOM dataset at offset: ${datasetOffset} with a transferSyntax of ${transferSyntax.uid}`, { level: 'info', category: 'parse' });
		const parser = new DICOMParser(buffer, transferSyntax);
		parser.byteStream.seek(datasetOffset);
		elements = parser.parse();

		// Step 3: Load pixel data (handles uncompressed, JPEG, color, etc.)
		debugLog(`Loading pixel data for ${elements.length} elements`, { level: 'info', category: 'parse' });
		pixelInfo = await loadPixelData(buffer, elements, transferSyntax.uid);
		currentFrame = 0;

		if (pixelInfo) {
			debugLog(`Pixel data loaded: ${pixelInfo.bitmaps.length} bitmaps`, { level: 'info', category: 'parse' });
		} else {
			debugLog('No pixel data found', { level: 'error', category: 'parse' });
		}

		// Step 4: Assign imageBitmap and trigger draw
		if (pixelInfo?.bitmaps?.[0]) {
			imageBitmap = pixelInfo.bitmaps[0];
			width = pixelInfo.width;
			height = pixelInfo.height;
			fitToScreen();
			draw();
		} else {
			debugLog('No pixel data could be extracted.', { level: 'error', category: 'parse' });
		}

		debugLog(`DICOM file ${file.name} loaded successfully`, { level: 'success', category: 'parse' });
	};

	onMount(() => {
		if (!wrapper || typeof window === 'undefined') return;

		if (!canvas) return;
		
		if (!ctx) {
			ctx = canvas.getContext('2d');
		}

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

		// if (w === lastDrawWidth && h === lastDrawHeight) return;
		lastDrawWidth = w;
		lastDrawHeight = h;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;

		if (!ctx) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);

		ctx.save();
		ctx.clearRect(0, 0, w, h);
		ctx.translate(offsetX, offsetY);
		ctx.scale(scale, scale);

		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, width, height);

		if (imageBitmap) {
			ctx.drawImage(imageBitmap, 0, 0);
		}

		ctx.restore();
	};

	const changeFrame = (delta: number) => {
		if (!pixelInfo || !pixelInfo.bitmaps || pixelInfo.bitmaps.length === 0) return;

		currentFrame = (currentFrame + delta + pixelInfo.bitmaps.length) % pixelInfo.bitmaps.length;
		imageBitmap = pixelInfo.bitmaps[currentFrame];
		draw();
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
		lastY = event.clientY;
		wrapper.setPointerCapture(event.pointerId);
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!wrapper || !isPanning) return;
		offsetX += event.clientX - lastX;
		offsetY += event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;

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

<div class="tabs">
	<button onclick = {() => activeTab = 'upload'} class:active={activeTab === 'upload'}>Upload DICOM</button>
	<button disabled={!files} onclick = {() => activeTab = 'viewer'} class:active={activeTab === 'viewer'}>View DICOM</button>
	<button disabled={!files} onclick = {() => activeTab = 'metadata'} class:active={activeTab === 'metadata'}>Metadata</button>
	{#if console}
		<button class="console-toggle" onclick={() => $visible = !$visible}>
			Console {$visible ? 'Off' : 'On'}
		</button>
	{/if}
</div>

<div class="viewer-container" style="height: {height ? height : 800}px; width: {width ? width : 1200}px;">
	{#if activeTab === 'upload'}
		<FileDropper bind:files />
		{#if files && files.length > 0}
			<Validate file={files[0]} />
		{/if}
	{/if}
	{#if activeTab === 'viewer'}
	<Controls {zoomIn} {zoomOut} {resetView} {fitToScreen} bind:showMetadata />
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
		{#if overlay}
			<p class="overlay">
				Zoom: {scale.toFixed(2)}, Pan: ({offsetX.toFixed(0)}, {offsetY.toFixed(0)})
			</p>
		{/if}
		<div class="frame-controls">
			<button onclick={() => changeFrame(-1)}>Previous Frame</button>
			<button onclick={() => changeFrame(1)}>Next Frame</button>
		</div>
	</div>
	{/if}
	{#if activeTab === 'metadata'}
		<Metadata {elements} />
	{/if}
	{#if console}
		<Console {logs} {visible} />
	{/if}
</div>

<style>
	.viewer-container {
		display: flex;
		position: relative;
		align-items: center;
		justify-content: center;
		background-color: var(--color-surface);
		flex-direction: column;
	}
	.view-wrapper {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		position: relative;
		touch-action: none;
		pointer-events: auto;
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
		right: 10px;
	}
		.tabs {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	.tabs button {
		padding: 0.5rem 1rem;
		cursor: pointer;
		background: var(--color-primary);
		color: var(--color-text);
		border: none;
		border-bottom: 2px solid transparent;
	}
	.tabs button.active {
		border-bottom: 2px solid orange;
	}
	.tabs button:disabled {
		background: var(--color-secondary);
		color: var(--color-text);
		cursor: not-allowed;
	}
	.console-toggle {
		margin-left: auto;
		background: #444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		cursor: pointer;
		border-radius: 4px;
	}

	.console-toggle:hover {
		background: #666;
	}
</style>
