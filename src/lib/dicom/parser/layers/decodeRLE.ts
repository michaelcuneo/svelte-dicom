import type { DecodedFrame, ImageInfo } from '$lib/dicom/types/types.js';

function decodeRLESegment(segment: Uint8Array, expectedLength: number): Uint8Array {
	const out = new Uint8Array(expectedLength);
	let inPos = 0;
	let outPos = 0;

	while (inPos < segment.length && outPos < expectedLength) {
		const n = segment[inPos++];
		if (n >= 0 && n <= 127) {
			// literal run: copy n+1 bytes
			const count = n + 1;
			for (let i = 0; i < count; i++) {
				out[outPos++] = segment[inPos++];
			}
		} else if (n >= 129 && n <= 255) {
			// replicated run: repeat next byte (257 - n) times
			const count = 257 - n;
			const value = segment[inPos++];
			out.fill(value, outPos, outPos + count);
			outPos += count;
		}
		// n == 128 is a no-op
	}
	return out;
}

export function decodeRLE(frameData: Uint8Array, info: ImageInfo): DecodedFrame {
	const { columns, rows, samplesPerPixel, bitsAllocated } = info;
	const numPixels = rows * columns;
	const bytesPerPixel = bitsAllocated / 8;
	const frameSize = numPixels * samplesPerPixel;

	const dv = new DataView(frameData.buffer, frameData.byteOffset, frameData.byteLength);
	const numSegments = dv.getInt32(0, true);
	const segmentOffsets: number[] = [];

	for (let i = 0; i < numSegments; i++) {
		segmentOffsets.push(dv.getInt32(4 + i * 4, true));
	}

	const decodedPlanes: Uint8Array[] = [];

	for (let i = 0; i < numSegments; i++) {
		const start = segmentOffsets[i];
		const end = i + 1 < numSegments ? segmentOffsets[i + 1] : frameData.byteLength;
		const segment = frameData.slice(start, end);
		const decoded = decodeRLESegment(segment, numPixels);
		decodedPlanes.push(decoded);
	}

	const out = new Uint8Array(frameSize * bytesPerPixel);

	// Recombine planes into pixel interleaved format
	for (let i = 0; i < numPixels; i++) {
		for (let byte = 0; byte < bytesPerPixel; byte++) {
			for (let sample = 0; sample < samplesPerPixel; sample++) {
				const planeIndex = sample * bytesPerPixel + byte;
				const pixelByte = decodedPlanes[planeIndex]?.[i] ?? 0;
				const dst = i * samplesPerPixel * bytesPerPixel + sample * bytesPerPixel + byte;
				out[dst] = pixelByte;
			}
		}
	}

	let data: Uint8Array | Uint16Array;
	if (bitsAllocated === 8) {
		data = out;
	} else if (bitsAllocated === 16) {
		data = new Uint16Array(numPixels * samplesPerPixel);
		for (let i = 0; i < data.length; i++) {
			const lo = out[i * 2];
			const hi = out[i * 2 + 1];
			data[i] = info.isLittleEndian ? (hi << 8) | lo : (lo << 8) | hi;
		}
	} else {
		throw new Error(`Unsupported BitsAllocated=${bitsAllocated}`);
	}

	return {
		width: columns,
		height: rows,
		data
	};
}
