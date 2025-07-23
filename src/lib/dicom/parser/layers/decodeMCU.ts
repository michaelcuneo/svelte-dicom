import { BitReader } from './BitReader';
import { ComponentSpec, JPEGHeader } from './ParseJPEGHeader.js';
import { zigZagInverse, idct8x8 } from './idct';

export function decodeMCUs(data: Uint8Array, header: JPEGHeader): Uint8ClampedArray {
	const {
		width,
		height,
		components,
		scanDataOffset,
		quantizationTables,
		huffmanTablesDC,
		huffmanTablesAC
	} = header;
	const numMCUsX = Math.ceil(width / 8);
	const numMCUsY = Math.ceil(height / 8);

	const pixels = new Uint8ClampedArray(width * height * 4);
	const reader = new BitReader(data.slice(scanDataOffset));
	const dcPrev: number[] = new Array(components.length).fill(0);

	for (let my = 0; my < numMCUsY; my++) {
		for (let mx = 0; mx < numMCUsX; mx++) {
			const mcu = [];

			for (let ci = 0; ci < components.length; ci++) {
				const comp = components[ci];
				const qTable = quantizationTables[comp.quantizationId];
				const huffDC = huffmanTablesDC[0]; // assume table 0
				const huffAC = huffmanTablesAC[0]; // assume table 0

				// === Decode DC ===
				const t = reader.readHuffman(huffDC);
				const dcDiff = reader.readBits(t);
				const dc = dcPrev[ci] + (dcDiff >> 0); // sign extend later
				dcPrev[ci] = dc;

				const block: number[] = new Array(64).fill(0);
				block[0] = dc;

				// === Decode AC ===
				let k = 1;
				while (k < 64) {
					const rs = reader.readHuffman(huffAC);
					if (rs === 0x00) break; // EOB
					const run = rs >> 4;
					const size = rs & 0x0f;
					k += run;
					if (k >= 64) break;
					const val = reader.readBits(size);
					block[k++] = val;
				}

				// === Dequantize + IDCT ===
				const zz = zigZagInverse(block);
				for (let i = 0; i < 64; i++) zz[i] *= qTable[i];
				const idct = idct8x8(zz);

				// === Write pixels ===
				for (let j = 0; j < 64; j++) {
					const dx = j % 8;
					const dy = Math.floor(j / 8);
					const px = mx * 8 + dx;
					const py = my * 8 + dy;
					if (px >= width || py >= height) continue;

					const i = (py * width + px) * 4;
					const Y = idct[j];
					const r = Y,
						g = Y,
						b = Y;

					pixels[i + 0] = r;
					pixels[i + 1] = g;
					pixels[i + 2] = b;
					pixels[i + 3] = 255;
				}
			}
		}
	}

	return pixels;
}
