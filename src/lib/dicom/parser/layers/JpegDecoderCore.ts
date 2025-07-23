export interface JPEGDecodeOptions {
	width: number;
	height: number;
	bitsPerSample: number;
	samplesPerPixel: number;
}

export interface JPEGDecodeResult {
	pixels: Uint8ClampedArray;
	width: number;
	height: number;
	components: number;
}

interface HuffmanTable {
	codes: Map<string, number>;
}

class BitReader {
	private pos = 0;
	private buffer: Uint8Array;
	private bitPos = 0;

	constructor(data: Uint8Array) {
		this.buffer = data;
	}

	readBit(): number {
		if (this.pos >= this.buffer.length) return 0;
		const byte = this.buffer[this.pos];
		const bit = (byte >> (7 - this.bitPos)) & 1;
		this.bitPos++;
		if (this.bitPos === 8) {
			this.bitPos = 0;
			this.pos++;
		}
		return bit;
	}

	readBits(n: number): number {
		let val = 0;
		for (let i = 0; i < n; i++) {
			val = (val << 1) | this.readBit();
		}
		return val;
	}

	readHuffman(table: HuffmanTable): number {
		let code = '';
		for (let i = 0; i < 16; i++) {
			code += this.readBit();
			if (table.codes.has(code)) {
				return table.codes.get(code)!;
			}
		}
		throw new Error('Invalid Huffman code');
	}
}

function ycbcrToRgb(Y: number, Cb: number, Cr: number): [number, number, number] {
	const y = Y;
	const cb = Cb - 128;
	const cr = Cr - 128;

	const r = clamp(y + 1.402 * cr);
	const g = clamp(y - 0.344136 * cb - 0.714136 * cr);
	const b = clamp(y + 1.772 * cb);

	return [r, g, b];
}

function clamp(value: number): number {
	return Math.min(255, Math.max(0, Math.round(value)));
}

function zigZagInverse(input: number[]): number[] {
	const zigZag = [
		0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11,
		18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34,
		37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63
	];
	const output = new Array(64).fill(0);
	for (let i = 0; i < input.length; i++) {
		output[zigZag[i]] = input[i];
	}
	return output;
}

function idct8x8(input: number[]): number[] {
	const output = new Array(64);
	const tmp = new Array(64);

	// 1D IDCT on rows
	for (let i = 0; i < 8; ++i) {
		const offset = i * 8;
		const s0 = input[offset + 0];
		const s1 = input[offset + 4];
		const s2 = input[offset + 2];
		const s3 = input[offset + 6];
		const s4 = input[offset + 5];
		const s5 = input[offset + 1];
		const s6 = input[offset + 7];
		const s7 = input[offset + 3];

		const p0 = s0 + s1;
		const p1 = s0 - s1;
		const p2 = s2 + s3;
		const p3 = s2 - s3;
		const p4 = s4 + s7;
		const p5 = s5 + s6;
		const p6 = s5 - s6;
		const p7 = s4 - s7;

		tmp[offset + 0] = p0 + p2;
		tmp[offset + 4] = p0 - p2;
		tmp[offset + 2] = p1 + p3;
		tmp[offset + 6] = p1 - p3;
		tmp[offset + 1] = p4 + p5;
		tmp[offset + 5] = p4 - p5;
		tmp[offset + 3] = p6 + p7;
		tmp[offset + 7] = p6 - p7;
	}

	// 1D IDCT on columns
	for (let i = 0; i < 8; ++i) {
		const s0 = tmp[i + 0];
		const s1 = tmp[i + 32];
		const s2 = tmp[i + 16];
		const s3 = tmp[i + 48];
		const s4 = tmp[i + 40];
		const s5 = tmp[i + 8];
		const s6 = tmp[i + 56];
		const s7 = tmp[i + 24];

		const p0 = s0 + s1;
		const p1 = s0 - s1;
		const p2 = s2 + s3;
		const p3 = s2 - s3;
		const p4 = s4 + s7;
		const p5 = s5 + s6;
		const p6 = s5 - s6;
		const p7 = s4 - s7;

		output[i + 0] = clamp((p0 + p2) / 8);
		output[i + 32] = clamp((p0 - p2) / 8);
		output[i + 16] = clamp((p1 + p3) / 8);
		output[i + 48] = clamp((p1 - p3) / 8);
		output[i + 8] = clamp((p4 + p5) / 8);
		output[i + 40] = clamp((p4 - p5) / 8);
		output[i + 24] = clamp((p6 + p7) / 8);
		output[i + 56] = clamp((p6 - p7) / 8);
	}

	return output;
}

export function decodeJPEG(
	raw: Uint8Array,
	huffmanTablesAC: { [id: number]: HuffmanTable },
	huffmanTablesDC: { [id: number]: HuffmanTable },
	options?: Partial<JPEGDecodeOptions>
): JPEGDecodeResult {
	const width = options?.width ?? 256;
	const height = options?.height ?? 256;
	const components = options?.samplesPerPixel ?? 3;
	const blockSize = 8; // Process data in 8x8 blocks
	const pixels = new Uint8ClampedArray(width * height * 4); // RGBA output

	// Initialize the BitReader
	const reader = new BitReader(raw);

	for (let y = 0; y < height; y += blockSize) {
		for (let x = 0; x < width; x += blockSize) {
			// Read 8x8 block for YCbCr components
			const blockY = new Array(64).fill(128);
			const blockCb = new Array(64).fill(128);
			const blockCr = new Array(64).fill(128);

			// Decode the blocks using Huffman tables (DC and AC coefficients)
			decodeBlock(reader, blockY, blockCb, blockCr, huffmanTablesDC, huffmanTablesAC);

			// Apply zigzag reordering
			const zzY = zigZagInverse(blockY);
			const zzCb = zigZagInverse(blockCb);
			const zzCr = zigZagInverse(blockCr);

			// Apply Inverse Discrete Cosine Transform (IDCT)
			const idctY = idct8x8(zzY);
			const idctCb = idct8x8(zzCb);
			const idctCr = idct8x8(zzCr);

			// Write the processed data back into the pixel array
			for (let j = 0; j < 64; j++) {
				const dx = j % 8;
				const dy = Math.floor(j / 8);
				const px = x + dx;
				const py = y + dy;

				if (px >= width || py >= height) continue;

				const i = (py * width + px) * 4;
				const Y = idctY[j];
				const Cb = idctCb[j];
				const Cr = idctCr[j];

				const [r, g, b] = ycbcrToRgb(Y, Cb, Cr);
				pixels[i + 0] = r;
				pixels[i + 1] = g;
				pixels[i + 2] = b;
				pixels[i + 3] = 255;
			}
		}
	}

	return {
		pixels,
		width,
		height,
		components
	};
}

/**
 * Decode one block using Huffman tables.
 */
function decodeBlock(
	reader: BitReader,
	blockY: number[],
	blockCb: number[],
	blockCr: number[],
	huffmanTablesDC: { [id: number]: HuffmanTable },
	huffmanTablesAC: { [id: number]: HuffmanTable }
): void {
	// Example Huffman decoding for Y, Cb, Cr blocks
	// Decode DC (first value)
	blockY[0] = reader.readHuffman(huffmanTablesDC[0]);
	blockCb[0] = reader.readHuffman(huffmanTablesDC[1]);
	blockCr[0] = reader.readHuffman(huffmanTablesDC[2]);

	// Decode AC (remaining values)
	for (let i = 1; i < 64; i++) {
		const symbolY = reader.readHuffman(huffmanTablesAC[0]);
		const symbolCb = reader.readHuffman(huffmanTablesAC[1]);
		const symbolCr = reader.readHuffman(huffmanTablesAC[2]);

		blockY[i] = symbolY;
		blockCb[i] = symbolCb;
		blockCr[i] = symbolCr;
	}
}
