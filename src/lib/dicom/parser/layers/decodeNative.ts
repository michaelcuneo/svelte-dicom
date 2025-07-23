import type { ImageInfo, DecodedFrame } from '$lib/dicom/types/types.js';
import { unpack10Bit, unpack12Bit } from './BitUnpacker.js';

export function decodeNative(
	frameData: Uint8Array,
	imageInfo: ImageInfo,
	littleEndian: boolean
): DecodedFrame {
	const { rows, columns, samplesPerPixel, bitsAllocated, pixelRepresentation } = imageInfo;

	const numPixels = rows * columns * samplesPerPixel;
	let pixelArray: Uint8Array | Uint16Array | Int16Array;

	if (bitsAllocated === 8) {
		pixelArray = new Uint8Array(frameData.buffer, frameData.byteOffset, numPixels);
	} else if (bitsAllocated === 16) {
		const arrayType = pixelRepresentation === 0 ? Uint16Array : Int16Array;
		pixelArray = new arrayType(numPixels);

		const dv = new DataView(frameData.buffer, frameData.byteOffset, frameData.byteLength);
		for (let i = 0; i < numPixels; i++) {
			pixelArray[i] = littleEndian ? dv.getUint16(i * 2, true) : dv.getUint16(i * 2, false);
		}
	} else if (bitsAllocated === 12) {
		pixelArray = unpack12Bit(frameData);
	} else if (bitsAllocated === 10) {
		pixelArray = unpack10Bit(frameData);
	} else {
		throw new Error(`Unsupported BitsAllocated: ${bitsAllocated}`);
	}

	return {
		width: columns,
		height: rows,
		data: pixelArray
	};
}
