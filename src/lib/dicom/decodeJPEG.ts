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

function clamp(v: number): number {
	return Math.min(255, Math.max(0, 128 + Math.round(v)));
}

export function decodeJPEG(
	raw: Uint8Array,
	options?: Partial<JPEGDecodeOptions>
): JPEGDecodeResult {
	// ... assume previous header and table parsing already done (e.g., DQT, DHT, SOF, SOS)
	// This simplified decoder assumes 4:4:4 sampling, baseline JPEG, 8-bit, 3 components

	const width = options?.width ?? 256;
	const height = options?.height ?? 256;
	const components = options?.samplesPerPixel ?? 3;

	const blockSize = 8;
	const pixels = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y += blockSize) {
		for (let x = 0; x < width; x += blockSize) {
			// For now, fill dummy 8x8 blocks
			const blockY = new Array(64).fill(128);
			const blockCb = new Array(64).fill(128);
			const blockCr = new Array(64).fill(128);

			const zzY = zigZagInverse(blockY);
			const zzCb = zigZagInverse(blockCb);
			const zzCr = zigZagInverse(blockCr);

			const idctY = idct8x8(zzY);
			const idctCb = idct8x8(zzCb);
			const idctCr = idct8x8(zzCr);

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
