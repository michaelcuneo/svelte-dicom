import type { DecodedFrame } from '$lib/dicom/types/types.js';
import { decodeJPEG as internalJPEGDecode } from './JpegDecoderCore.js';
import { parseJPEGHeader } from './ParseJPEGHeader.js';

export function decodeJPEG(jpegBytes: Uint8Array): DecodedFrame {
	// You’ll want to parse SOF and SOS headers to get width/height dynamically
	// Instead of hardcoding width and height, decode the JPEG headers
	const options = parseJPEGHeader(jpegBytes); // Assuming parseJPEGHeader() is implemented

	if (!options) {
		throw new Error('Failed to parse JPEG headers');
	}

	// Call internal JPEG decoder with dynamic options
	const decoded = internalJPEGDecode(jpegBytes, options);

	// Return DecodedFrame
	return {
		width: decoded.width,
		height: decoded.height,
		data: decoded.pixels // RGBA Uint8ClampedArray
	};
}
