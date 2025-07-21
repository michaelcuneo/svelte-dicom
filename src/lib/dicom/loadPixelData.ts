import { debugLog } from './debugStore.js';
// import { decodeJPEG } from './decodeJPEG.js';

export interface PixelInfo {
	bitmaps: ImageBitmap[];
	width: number;
	height: number;
	frames: number;
	photometricInterpretation: string;
}

function toNumber(raw: number | string | Uint8Array | null | undefined, tag: string): number {
	if (raw === undefined || raw === null) return NaN;
	if (typeof raw === 'number') return raw;
	if (typeof raw === 'string') return parseInt(raw);
	if (raw instanceof Uint8Array && raw.length >= 2) {
		const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
		return dv.getUint16(0, true);
	}
	debugLog(`Cannot parse value for ${tag}`, { level: 'warn', category: 'DICOM' });
	return NaN;
}

export async function loadPixelData(
	buffer: ArrayBuffer,
	elements: { tag: string; value: string | number | Uint8Array | null }[],
	transferSyntaxUID: string
): Promise<PixelInfo | null> {
	const extractInt = (tag: string, fallback = 0): number => {
		const raw = elements.find((e) => e.tag === tag)?.value;
		const value = toNumber(raw, tag);
		return Number.isFinite(value) ? value : fallback;
	};

	const samplesPerPixel = extractInt('0028,0002', 1);
	const numFrames = extractInt('0028,0008', 1);
	const rows = extractInt('0028,0010', 512);
	const cols = extractInt('0028,0011', 512);
	const bitsAllocated = extractInt('0028,0100', 8);
	const interp = String(elements.find((e) => e.tag === '0028,0004')?.value || 'MONOCHROME2');
	const planarConfig = extractInt('0028,0006', 0); // 0 = interleaved, 1 = planar

	debugLog(
		`Pixel Data: ${rows}x${cols}, ${samplesPerPixel} samples, ${bitsAllocated} bits, planar=${planarConfig}`,
		{
			level: 'debug',
			category: 'DICOM'
		}
	);

	if (!Number.isFinite(rows) || !Number.isFinite(cols)) {
		debugLog(`Invalid image dimensions: rows=${rows}, cols=${cols}`, {
			level: 'error',
			category: 'DICOM'
		});
		return null;
	}

	const pixelEl = elements.find((e) => e.tag === '7FE0,0010');
	if (!pixelEl || !pixelEl.value) {
		debugLog('Missing Pixel Data (7FE0,0010)', {
			level: 'warn',
			category: 'DICOM'
		});
		return null;
	}

	const bitmaps: ImageBitmap[] = [];
	const isEncapsulated = transferSyntaxUID.startsWith('1.2.840.10008.1.2.4.');

	if (isEncapsulated) {
		const fragments = Array.isArray(pixelEl.value) ? pixelEl.value : [pixelEl.value];
		/*
		const mimeMap: Record<string, string> = {
			'1.2.840.10008.1.2.4.50': 'image/jpeg',
			'1.2.840.10008.1.2.4.70': 'image/jpeg',
			'1.2.840.10008.1.2.4.57': 'image/jpeg',
			'1.2.840.10008.1.2.4.80': 'image/jls',
			'1.2.840.10008.1.2.4.90': 'image/jls',
			'1.2.840.10008.1.2.4.91': 'image/jls',
			'1.2.840.10008.1.2.4.100': 'image/jp2',
			'1.2.840.10008.1.2.4.102': 'image/jp2',
			'1.2.840.10008.1.2.4.103': 'image/jp2'
		};
		const mime = mimeMap[transferSyntaxUID] || 'image/jpeg';
		*/

		for (const frag of fragments) {
			if (!(frag instanceof Uint8Array)) continue;

			try {
				const raw = new Uint8Array(frag.buffer, frag.byteOffset, frag.byteLength);
				const blob = new Blob([raw], { type: 'image/jpeg' });
				const bitmap = await createImageBitmap(blob);

				bitmaps.push(bitmap);
			} catch (err) {
				debugLog(`Failed to decode JPEG frame: ${err}`, {
					level: 'error',
					category: 'DICOM'
				});
			}
		}
	} else {
		let rawPixelData: Uint8Array | null = null;

		if (pixelEl.value instanceof Uint8Array) {
			rawPixelData = pixelEl.value;
		} else {
			debugLog('Pixel data is not Uint8Array', {
				level: 'warn',
				category: 'DICOM'
			});
			return null;
		}

		const bytesPerSample = bitsAllocated > 8 ? 2 : 1;
		const frameLength = rows * cols * samplesPerPixel * bytesPerSample;

		for (let f = 0; f < numFrames; f++) {
			const start = f * frameLength;
			const end = start + frameLength;
			const slice = rawPixelData.slice(start, end);
			const imageData = new ImageData(cols, rows);
			const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);

			if (samplesPerPixel === 1) {
				if (bitsAllocated <= 8) {
					for (let i = 0; i < slice.length; i++) {
						const gray = slice[i];
						const idx = i * 4;
						imageData.data[idx + 0] = gray;
						imageData.data[idx + 1] = gray;
						imageData.data[idx + 2] = gray;
						imageData.data[idx + 3] = 255;
					}
				} else {
					for (let i = 0; i < cols * rows; i++) {
						const gray16 = view.getUint16(i * 2, true);
						const gray = gray16 >> 8;
						const idx = i * 4;
						imageData.data[idx + 0] = gray;
						imageData.data[idx + 1] = gray;
						imageData.data[idx + 2] = gray;
						imageData.data[idx + 3] = 255;
					}
				}
			} else if (samplesPerPixel === 3) {
				if (planarConfig === 1) {
					const pixels = cols * rows;
					for (let i = 0; i < pixels; i++) {
						const r = bitsAllocated <= 8 ? slice[i] : view.getUint16(i * 2, true) >> 8;
						const g =
							bitsAllocated <= 8 ? slice[pixels + i] : view.getUint16((pixels + i) * 2, true) >> 8;
						const b =
							bitsAllocated <= 8
								? slice[2 * pixels + i]
								: view.getUint16((2 * pixels + i) * 2, true) >> 8;
						const dst = i * 4;
						imageData.data[dst + 0] = r;
						imageData.data[dst + 1] = g;
						imageData.data[dst + 2] = b;
						imageData.data[dst + 3] = 255;
					}
				} else {
					for (let i = 0; i < cols * rows; i++) {
						const r = bitsAllocated <= 8 ? slice[i * 3 + 0] : view.getUint16(i * 6 + 0, true) >> 8;
						const g = bitsAllocated <= 8 ? slice[i * 3 + 1] : view.getUint16(i * 6 + 2, true) >> 8;
						const b = bitsAllocated <= 8 ? slice[i * 3 + 2] : view.getUint16(i * 6 + 4, true) >> 8;
						const dst = i * 4;
						imageData.data[dst + 0] = r;
						imageData.data[dst + 1] = g;
						imageData.data[dst + 2] = b;
						imageData.data[dst + 3] = 255;
					}
				}
			} else {
				debugLog(`Unsupported samplesPerPixel: ${samplesPerPixel}`, {
					level: 'warn',
					category: 'DICOM'
				});
				continue;
			}

			const bitmap = await createImageBitmap(imageData);
			bitmaps.push(bitmap);
		}
	}

	if (bitmaps.length === 0) {
		debugLog('No decodable image frames', {
			level: 'warn',
			category: 'DICOM'
		});
		return null;
	}

	return {
		bitmaps,
		width: cols,
		height: rows,
		frames: bitmaps.length,
		photometricInterpretation: interp
	};
}
