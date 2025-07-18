<script lang="ts">
	import { onMount } from 'svelte';
	import { DICOMParser } from '$lib/dicom/DICOMParser.js';
	import { TRANSFER_SYNTAXES, type TransferSyntax } from '$lib/dicom/TransferSyntax.js';
	import { getElementKeyword } from '$lib/dicom/DICOMDictionary.js';

	let { files }: { files: FileList | null } = $props();

	let wrapper: HTMLDivElement | undefined = $state(undefined);
	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | null = $state(null);

	let debug: boolean = $state(true);

	let pixelBuffer: ImageData | null = $state(null);
	let width: number = $state(256);
	let height: number = $state(256);

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
		const tmpParser = new DICOMParser(buffer);
		const meta = tmpParser.parseMeta();
		const transferSyntax: TransferSyntax = tmpParser.getTransferSyntaxFromMeta(meta);
		const parser = new DICOMParser(buffer, transferSyntax);
		elements = parser.parse();

		const rowsEl = elements.find((el) => el.tag === '0028,0010');
		const colsEl = elements.find((el) => el.tag === '0028,0011');
		const rows = Number(rowsEl?.value) || 1024;
		const cols = Number(colsEl?.value) || 1024;

		const bitsAllocated = Number(elements.find((el) => el.tag === '0028,0100')?.value) || 8;
		const samplesPerPixel = Number(elements.find((el) => el.tag === '0028,0002')?.value) || 1;
		const photoInterp =
			elements.find((el) => el.tag === '0028,0004')?.value?.toString() || 'MONOCHROME2';
		const windowCenter = Number(elements.find((el) => el.tag === '0028,1050')?.value) || 128;
		const windowWidth = Number(elements.find((el) => el.tag === '0028,1051')?.value) || 256;
		const inverted = photoInterp === 'MONOCHROME1';

		console.log({ rowsEl, colsEl });

		const applyWindow = (val: number) => {
			const min = windowCenter - windowWidth / 2;
			const max = windowCenter + windowWidth / 2;
			const scaled = ((val - min) / (max - min)) * 255;
			return Math.min(255, Math.max(0, scaled));
		};

		const bytes = new Uint8Array(buffer);
		for (let i = 0; i < bytes.length - 4; i++) {
			if (
				bytes[i] === 0xe0 &&
				bytes[i + 1] === 0x7f &&
				bytes[i + 2] === 0x10 &&
				bytes[i + 3] === 0x00
			) {
				const pixelStart = i + 8;
				const imageData = new ImageData(cols, rows);

				if (bitsAllocated === 16) {
					const raw = new Uint16Array(buffer, pixelStart, rows * cols);
					const imageData = new ImageData(cols, rows);
					for (let j = 0; j < raw.length; j++) {
						const mapped = applyWindow(raw[j]);
						const val = inverted ? 255 - mapped : mapped;
						imageData.data[j * 4 + 0] = val;
						imageData.data[j * 4 + 1] = val;
						imageData.data[j * 4 + 2] = val;
						imageData.data[j * 4 + 3] = 255;
					}
					pixelBuffer = imageData;
					imageBitmap = await createImageBitmap(imageData);
				} else if (samplesPerPixel === 1) {
					const raw = new Uint8Array(buffer, pixelStart, rows * cols);
					const imageData = new ImageData(cols, rows);
					for (let j = 0; j < raw.length; j++) {
						const mapped = applyWindow(raw[j]);
						const val = inverted ? 255 - mapped : mapped;
						imageData.data[j * 4 + 0] = val;
						imageData.data[j * 4 + 1] = val;
						imageData.data[j * 4 + 2] = val;
						imageData.data[j * 4 + 3] = 255;
					}
					pixelBuffer = imageData;
					imageBitmap = await createImageBitmap(imageData);
				} else if (samplesPerPixel === 3) {
					const raw = new Uint8Array(buffer, pixelStart, rows * cols * 3);
					const imageData = new ImageData(cols, rows);
					for (let i = 0; i < cols * rows; i++) {
						const base = i * 3;
						imageData.data[i * 4 + 0] = raw[base + 0]; // R
						imageData.data[i * 4 + 1] = raw[base + 1]; // G
						imageData.data[i * 4 + 2] = raw[base + 2]; // B
						imageData.data[i * 4 + 3] = 255;
					}
					pixelBuffer = imageData;
					imageBitmap = await createImageBitmap(imageData);
				}

				width = cols;
				height = rows;
				fitToScreen();
				draw();
				break;
			}
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

		draw();
	});

	const draw = () => {
		if (!canvas || !wrapper) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const { width, height } = wrapper.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.translate(offsetX, offsetY);
		ctx.scale(scale, scale);

		if (imageBitmap) {
			ctx.drawImage(imageBitmap, 0, 0);
		}

		ctx.restore();

		console.log('Redraw triggered');
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
	<p style="color:white;position:absolute;bottom:10px;left:10px;">
		Zoom: {scale.toFixed(2)}, Pan: ({offsetX}, {offsetY})
	</p>
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
		background: black;
		display: block;
		image-rendering: pixelated;
		width: 100%;
		height: 100%;
		z-index: 1;
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
