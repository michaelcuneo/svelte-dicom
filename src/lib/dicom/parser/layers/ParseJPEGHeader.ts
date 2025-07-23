import { debugLog } from '$lib/dicom/utils/debugStore.js';

export interface QuantizationTable {
	[id: number]: number[]; // 64 entries per table
}

export interface HuffmanTable {
	codes: Map<string, number>;
}

export interface ComponentSpec {
	id: number;
	h: number;
	v: number;
	quantizationId: number;
}

export interface JPEGHeader {
	width: number;
	height: number;
	bitsPerSample: number;
	components: ComponentSpec[];
	quantizationTables: QuantizationTable;
	huffmanTablesDC: { [id: number]: HuffmanTable };
	huffmanTablesAC: { [id: number]: HuffmanTable };
	scanDataOffset: number;
}

function readUint16(data: Uint8Array, offset: number) {
	return (data[offset] << 8) | data[offset + 1];
}

function buildHuffmanTable(lengths: number[], symbols: number[]): HuffmanTable {
	const codes = new Map<string, number>();
	let code = 0;
	let k = 0;
	for (let i = 0; i < lengths.length; i++) {
		const len = lengths[i];
		for (let j = 0; j < len; j++) {
			const symbol = symbols[k++];
			const bin = code.toString(2).padStart(i + 1, '0');
			codes.set(bin, symbol);
			code++;
		}
		code <<= 1;
	}
	return { codes };
}

export function parseJPEGHeader(data: Uint8Array): JPEGHeader {
	let offset = 0;
	const quantizationTables: QuantizationTable = {};
	const huffmanTablesDC: { [id: number]: HuffmanTable } = {};
	const huffmanTablesAC: { [id: number]: HuffmanTable } = {};
	let width = 0;
	let height = 0;
	let bitsPerSample = 8;
	let components: ComponentSpec[] = [];
	let scanDataOffset = 0;

	if (readUint16(data, offset) !== 0xffd8) throw new Error('Not a JPEG file (missing SOI)');
	offset += 2;

	debugLog('SOI (Start of Image) found, beginning JPEG parsing.', {
		level: 'debug',
		category: 'JPEG'
	});

	while (offset < data.length) {
		if (data[offset] !== 0xff) throw new Error(`Expected marker at ${offset}`);
		const marker = data[offset + 1];
		offset += 2;

		debugLog(`Found marker: 0x${marker.toString(16)}`, { level: 'debug', category: 'JPEG' });

		if (marker === 0xd9) break; // EOI (End of Image)
		if (marker === 0xda) {
			// SOS (Start of Scan)
			const length = readUint16(data, offset);
			scanDataOffset = offset + length;
			debugLog(`Found SOS (Start of Scan), scan data offset: ${scanDataOffset}`, {
				level: 'debug',
				category: 'JPEG'
			});
			break; // Stop at SOS
		}

		const length = readUint16(data, offset);
		const sectionEnd = offset + length;

		switch (marker) {
			case 0xdb: {
				// DQT - Define Quantization Table
				debugLog('Parsing DQT (Define Quantization Table)', { level: 'debug', category: 'JPEG' });
				let p = offset + 2;
				while (p < sectionEnd) {
					const pqTq = data[p++];
					const precision = pqTq >> 4;
					const id = pqTq & 0x0f;
					debugLog(`DQT Table ${id}: precision = ${precision}`, {
						level: 'debug',
						category: 'JPEG'
					});
					const table = new Array(64);
					for (let i = 0; i < 64; i++) {
						table[i] = data[p++];
					}
					quantizationTables[id] = table;
					debugLog(`DQT Table ${id} loaded: ${table}`, { level: 'debug', category: 'JPEG' });
				}
				break;
			}

			case 0xc0: {
				// SOF0 - Start of Frame 0
				debugLog('Parsing SOF0 (Start of Frame 0)', { level: 'debug', category: 'JPEG' });
				bitsPerSample = data[offset + 2];
				height = readUint16(data, offset + 3);
				width = readUint16(data, offset + 5);
				const numComponents = data[offset + 7];
				components = [];
				let p = offset + 8;
				for (let i = 0; i < numComponents; i++) {
					const id = data[p++];
					const hv = data[p++];
					const h = hv >> 4;
					const v = hv & 0x0f;
					const qId = data[p++];
					components.push({ id, h, v, quantizationId: qId });
					debugLog(`Component ${id}: h = ${h}, v = ${v}, quantizationId = ${qId}`, {
						level: 'debug',
						category: 'JPEG'
					});
				}
				debugLog(`SOF0: Image dimensions ${width}x${height}, ${numComponents} components`, {
					level: 'debug',
					category: 'JPEG'
				});
				break;
			}

			case 0xc4: {
				// DHT - Define Huffman Table
				debugLog('Parsing DHT (Define Huffman Table)', { level: 'debug', category: 'JPEG' });
				let p = offset + 2;
				while (p < sectionEnd) {
					const htInfo = data[p++];
					const isAC = htInfo >> 4;
					const tableId = htInfo & 0x0f;
					debugLog(`Huffman table ${tableId}: isAC = ${isAC}`, {
						level: 'debug',
						category: 'JPEG'
					});

					// Read the lengths
					const lengths: number[] = Array.from(data.slice(p, p + 16));
					p += 16;
					debugLog(`Huffman lengths for table ${tableId}: ${lengths}`, {
						level: 'debug',
						category: 'JPEG'
					});

					// Read the symbols
					const total = lengths.reduce((a, b) => a + b, 0);
					const symbols: number[] = Array.from(data.slice(p, p + total));
					p += total;
					debugLog(`Huffman symbols for table ${tableId}: ${symbols}`, {
						level: 'debug',
						category: 'JPEG'
					});

					// Build the Huffman table
					const table = buildHuffmanTable(lengths, symbols);
					debugLog(`Built Huffman table ${tableId}`, { level: 'debug', category: 'JPEG' });

					if (isAC) {
						huffmanTablesAC[tableId] = table;
						debugLog(`Stored in AC table ${tableId}`, { level: 'debug', category: 'JPEG' });
					} else {
						huffmanTablesDC[tableId] = table;
						debugLog(`Stored in DC table ${tableId}`, { level: 'debug', category: 'JPEG' });
					}
				}
				break;
			}

			default:
				// Skip APPn, COM, etc.
				debugLog(`Skipping unknown marker: 0x${marker.toString(16)}`, {
					level: 'debug',
					category: 'JPEG'
				});
				break;
		}

		offset = sectionEnd;
	}

	return {
		width,
		height,
		bitsPerSample,
		components,
		quantizationTables,
		huffmanTablesDC,
		huffmanTablesAC,
		scanDataOffset
	};
}
