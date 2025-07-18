export interface PixelInfo {
	bitmaps: ImageBitmap[];
	width: number;
	height: number;
	frames: number;
	photometricInterpretation: string;
}

function toNumber(raw: number | string | Uint8Array[], tag: string): number {
	if (typeof raw === 'number') return raw;
	if (typeof raw === 'string') return parseInt(raw);
	if (raw instanceof Uint8Array) {
		if (raw.length >= 2) {
			const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
			const value = dv.getUint16(0, true); // Assume little-endian
			console.log(`Uint8Array for tag ${tag}:`, raw, '→', value);
			return value;
		}
	}
	console.warn(`Cannot parse numeric value for tag ${tag}`, raw);
	return NaN;
}

export async function loadPixelData(
	buffer: ArrayBuffer,
	elements: {
		tag: string;
		value: number | string | Uint8Array | Uint8Array[] | null | undefined;
	}[],
	transferSyntaxUID: string
): Promise<PixelInfo | null> {
	function extractIntValue(tag: string, fallback: number): number {
		const raw = elements.find((e) => e.tag === tag)?.value;
		if (typeof raw === 'number') return raw;
		if (typeof raw === 'string') return parseInt(raw);
		if (raw instanceof Uint8Array && raw.length > 0) {
			const str = new TextDecoder().decode(raw).trim();
			const parsed = parseInt(str);
			if (!Number.isNaN(parsed)) return parsed;
		}
		return fallback;
	}

	const rawSamples = elements.find((e) => e.tag === '0028,0002')?.value || 1;
	const rawFrames = elements.find((e) => e.tag === '0028,0008')?.value || 1;
	const interp = String(elements.find((e) => e.tag === '0028,0004')?.value || 'MONOCHROME2');

	const rows = extractIntValue('0028,0010', 512);
	const cols = extractIntValue('0028,0011', 512);

	const samplesPerPixel = toNumber(rawSamples, '0028,0002');
	const numFrames = toNumber(rawFrames, '0028,0008');

	console.log('Decoded DICOM dimensions:', { rows, cols, samplesPerPixel, numFrames });

	if (!Number.isFinite(rows) || !Number.isFinite(cols)) {
		throw new Error(`Invalid dimensions: rows=${rows}, cols=${cols}`);
	}

	const pixelEl = elements.find((e) => e.tag === '7FE0,0010');
	if (!pixelEl) {
		console.warn('Pixel Data element (7FE0,0010) not found.');
		return null;
	}

	const encapsulated = transferSyntaxUID.startsWith('1.2.840.10008.1.2.4.');
	console.log('pixelEl:', pixelEl);
	console.log('transferSyntaxUID:', transferSyntaxUID);
	console.log('samplesPerPixel:', samplesPerPixel);
	console.log('rows × cols × frames:', rows, cols, numFrames);
	const bitmaps: ImageBitmap[] = [];

	if (encapsulated) {
		const fragments = Array.isArray(pixelEl.value) ? pixelEl.value : [pixelEl.value];

		for (const frag of fragments) {
			if (!frag) continue;
			if (typeof frag === 'number') continue; // Skip invalid type
			const blob = new Blob([frag], { type: 'image/jpeg' });
			const bitmap = await createImageBitmap(blob);
			bitmaps.push(bitmap);
		}
	} else {
		const offset = (pixelEl as { valueOffset?: number }).valueOffset || 0;
		const frameLength = rows * cols * samplesPerPixel;
		const fullData = new Uint8Array(buffer, offset, frameLength * numFrames);

		for (let f = 0; f < numFrames; f++) {
			const slice = fullData.slice(f * frameLength, (f + 1) * frameLength);
			const imageData = new ImageData(cols, rows);

			if (samplesPerPixel === 1) {
				for (let i = 0; i < slice.length; i++) {
					const val = slice[i];
					const idx = i * 4;
					imageData.data[idx + 0] = val;
					imageData.data[idx + 1] = val;
					imageData.data[idx + 2] = val;
					imageData.data[idx + 3] = 255;
				}
			} else if (samplesPerPixel === 3) {
				for (let i = 0; i < cols * rows; i++) {
					const base = i * 3;
					const idx = i * 4;
					imageData.data[idx + 0] = slice[base + 0];
					imageData.data[idx + 1] = slice[base + 1];
					imageData.data[idx + 2] = slice[base + 2];
					imageData.data[idx + 3] = 255;
				}
			}

			const bitmap = await createImageBitmap(imageData);
			bitmaps.push(bitmap);
		}
	}

	return {
		bitmaps,
		width: cols,
		height: rows,
		frames: bitmaps.length,
		photometricInterpretation: interp
	};
}
