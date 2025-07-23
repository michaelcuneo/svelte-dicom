import type { ImageInfo, DICOMElement } from '$lib/dicom/types/types.js';
import { convertPaletteColorToRGBA } from './PaletteColor.js';

export function ybrToRgb(Y: number, Cb: number, Cr: number): [number, number, number] {
	const y = Y;
	const cb = Cb - 128;
	const cr = Cr - 128;

	const r = clamp(y + 1.402 * cr);
	const g = clamp(y - 0.344136 * cb - 0.714136 * cr);
	const b = clamp(y + 1.772 * cb);

	return [r, g, b];
}

export function invertMonochrome(pixel: number, bitsStored: number): number {
	const max = (1 << bitsStored) - 1;
	return max - pixel;
}

function clamp(v: number): number {
	return Math.max(0, Math.min(255, Math.round(v)));
}

export function convertToRGBA(
	data: Uint8Array | Uint16Array | Int16Array,
	info: ImageInfo,
	metadata: Map<string, DICOMElement>
): Uint8ClampedArray {
	const { columns, rows, photometricInterpretation, samplesPerPixel, bitsStored } = info;

	if (photometricInterpretation === 'PALETTE COLOR') {
		if (!metadata) throw new Error('PALETTE COLOR requires metadata');
		return convertPaletteColorToRGBA(
			data instanceof Int16Array ? new Uint16Array(data) : data,
			info,
			metadata
		);
	}

	const out = new Uint8ClampedArray(rows * columns * 4);

	const isMono1 = photometricInterpretation === 'MONOCHROME1';
	const isMono2 = photometricInterpretation === 'MONOCHROME2';
	const isYBR = photometricInterpretation.startsWith('YBR');
	const isRGB = photometricInterpretation === 'RGB';

	for (let i = 0; i < rows * columns; i++) {
		let r = 0,
			g = 0,
			b = 0;

		if (samplesPerPixel === 1 && (isMono1 || isMono2)) {
			let gray =
				data instanceof Uint8Array || data instanceof Uint16Array || data instanceof Int16Array
					? data[i]
					: 0;
			if (isMono1) gray = invertMonochrome(gray, bitsStored);
			r = g = b = scaleTo8bit(gray, bitsStored);
		}

		if (samplesPerPixel === 3) {
			const idx = i * 3;
			const Y = data[idx + 0];
			const Cb = data[idx + 1];
			const Cr = data[idx + 2];
			if (isYBR) {
				[r, g, b] = ybrToRgb(Y, Cb, Cr);
			} else if (isRGB) {
				r = scaleTo8bit(Y, bitsStored);
				g = scaleTo8bit(Cb, bitsStored);
				b = scaleTo8bit(Cr, bitsStored);
			}
		}

		const o = i * 4;
		out[o + 0] = r;
		out[o + 1] = g;
		out[o + 2] = b;
		out[o + 3] = 255;
	}

	return out;
}

function scaleTo8bit(v: number, bitsStored: number): number {
	const maxIn = (1 << bitsStored) - 1;
	return Math.round((v / maxIn) * 255);
}
