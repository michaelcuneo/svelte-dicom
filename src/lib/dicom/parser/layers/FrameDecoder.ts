import type { ImageInfo, TransferSyntaxInfo, DecodedFrame } from '$lib/dicom/types/types.js';
import { decodeJPEG } from './JpegDecoderCore.js';
import { decodeNative } from './decodeNative.js';
import { decodeRLE } from './decodeRLE.js';

export interface LazyFrameDecoder {
	frameCount: number;
	getFrame(index: number): Promise<DecodedFrame>;
}

export function createLazyFrameDecoder(
	frames: Uint8Array[], // One entry per frame (encapsulated or sliced)
	transferSyntax: TransferSyntaxInfo,
	imageInfo: ImageInfo,
	huffmanTablesDC: { [id: number]: HuffmanTable }, // Add Huffman tables DC
	huffmanTablesAC: { [id: number]: HuffmanTable } // Add Huffman tables AC
): LazyFrameDecoder {
	const { isEncapsulated, isJPEG, isJPEG2000, isRLE, isLittleEndian } = transferSyntax;

	async function getFrame(index: number): Promise<DecodedFrame> {
		const frameData = frames[index];
		if (!frameData) throw new Error(`Frame ${index} not available.`);

		if (isEncapsulated) {
			if (isJPEG) {
				// Pass the Huffman tables to decodeJPEG
				return decodeJPEG(frameData, huffmanTablesDC, huffmanTablesAC, {
					width: imageInfo.columns,
					height: imageInfo.rows,
					bitsPerSample: imageInfo.bitsAllocated,
					samplesPerPixel: imageInfo.samplesPerPixel
				});
			}
			if (isRLE) {
				// Ensure decodeRLE works with the provided parameters
				return decodeRLE(frameData, imageInfo);
			}
			if (isJPEG2000) {
				throw new Error('JPEG2000 decoder not implemented yet');
			}
			throw new Error('Unsupported encapsulated transfer syntax');
		} else {
			// Handle uncompressed (native) frames
			return decodeNative(frameData, imageInfo, isLittleEndian);
		}
	}

	return {
		frameCount: frames.length,
		getFrame
	};
}
