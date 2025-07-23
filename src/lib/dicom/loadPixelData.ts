import type { DecodedFrame, ImageInfo } from '$lib/dicom/types/types.js';
import { debugLog } from './utils/debugStore.js';
import { extractPixelData } from '$lib/dicom/parser/layers/PixelDataLayer.js';
import { createLazyFrameDecoder } from '$lib/dicom/parser/layers/FrameDecoder.js';
import { extractImageInfo } from '$lib/dicom/parser/image/ImageInfo.js';
import { convertToRGBA } from '$lib/dicom/parser/image/ColorModel.js';
import { parseJPEGHeader } from './parser/layers/ParseJPEGHeader.js';

export interface PixelInfo {
	bitmaps: ImageBitmap[];
	frames: DecodedFrame[];
	width: number;
	height: number;
	framesCount: number;
	imageInfo: ImageInfo;
	photometricInterpretation: string;
}

export async function loadPixelData(
	buffer: ArrayBuffer,
	elements: { tag: string; value: ArrayBuffer | string | number | null }[],
	transferSyntaxUID: string
): Promise<PixelInfo | null> {
	const pixelElement = elements.find((e) => e.tag === '7FE0,0010');
	debugLog(`Extracting pixel data for transfer syntax: ${transferSyntaxUID}`, {
		level: 'debug',
		category: 'DICOM'
	});

	if (!pixelElement || !pixelElement.value) {
		debugLog('Missing Pixel Data (7FE0,0010)', {
			level: 'warn',
			category: 'DICOM'
		});
		return null;
	}

	const metadata = new Map(elements.map((e) => [e.tag, e]));

	try {
		const imageInfo = extractImageInfo(elements);
		const dataSet = new Map(elements.map((e) => [e.tag.toUpperCase(), e]));
		const transferSyntax = {
			uid: transferSyntaxUID,
			isEncapsulated: transferSyntaxUID.startsWith('1.2.840.10008.1.2.4.'), // Handle encapsulated types
			isLittleEndian: true, // Replace with actual check if needed
			isImplicitVR: false // Same here
		};

		const jpegHeader = parseJPEGHeader(pixelElement.value);

		if (!jpegHeader) {
			throw new Error('Failed to parse JPEG header');
		}

		debugLog(`JPEGHeader: ${jpegHeader}`, {
			level: 'debug',
			category: 'JPEG'
		});

		// Extract pixel data from the dataset (handles compressed or raw pixel data)
		const pixelData = extractPixelData(dataSet, transferSyntax);

		if (!pixelData) {
			debugLog('extractPixelData() returned null', { level: 'error' });
			return null;
		}

		const framesRaw = pixelData.frames;

		// Create LazyFrameDecoder
		const decoder = createLazyFrameDecoder(
			framesRaw,
			transferSyntax,
			imageInfo,
			jpegHeader.huffmanTablesDC, // Pass the Huffman tables here
			jpegHeader.huffmanTablesAC // Pass the Huffman tables here
		);

		const frames: DecodedFrame[] = [];
		const bitmaps: ImageBitmap[] = [];

		for (let i = 0; i < framesRaw.length; i++) {
			const frame = await decoder.getFrame(i);
			frames.push(frame);

			const rgba = convertToRGBA(frame.data, imageInfo, metadata);
			const imageData = new ImageData(rgba, frame.width, frame.height);
			const bitmap = await createImageBitmap(imageData);
			bitmaps.push(bitmap);
		}

		return {
			bitmaps,
			frames,
			width: imageInfo.columns,
			height: imageInfo.rows,
			framesCount: frames.length,
			imageInfo,
			photometricInterpretation: imageInfo.photometricInterpretation
		};
	} catch (err) {
		debugLog('Failed to load pixel data: ' + err, {
			level: 'error',
			category: 'DICOM'
		});
		return null;
	}
}
