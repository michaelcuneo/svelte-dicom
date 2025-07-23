import type { DICOMElement, ImageInfo } from '$lib/dicom/types/types.js';

export function getPaletteLUT(
	metadata: Map<string, DICOMElement>
): ((index: number) => [number, number, number]) | undefined {
	const redDesc = metadata.get('0028,1101')?.value as number[] | undefined;
	const greenDesc = metadata.get('0028,1102')?.value as number[] | undefined;
	const blueDesc = metadata.get('0028,1103')?.value as number[] | undefined;

	const redData = metadata.get('0028,1201')?.value as Uint8Array | Uint16Array | undefined;
	const greenData = metadata.get('0028,1202')?.value as Uint8Array | Uint16Array | undefined;
	const blueData = metadata.get('0028,1203')?.value as Uint8Array | Uint16Array | undefined;

	if (!redDesc || !greenDesc || !blueDesc || !redData || !greenData || !blueData) return;

	const lutLength = redDesc[0] || 256;
	const bits = redDesc[2] || 8;

	const getValue = (data: Uint8Array | Uint16Array, idx: number): number => {
		if (data instanceof Uint8Array) return data[idx] ?? 0;
		return data[idx] ?? 0;
	};

	const shift = bits > 8 ? bits - 8 : 0;

	return (index: number): [number, number, number] => {
		index = Math.min(lutLength - 1, Math.max(0, index));
		const r = getValue(redData, index) >> shift;
		const g = getValue(greenData, index) >> shift;
		const b = getValue(blueData, index) >> shift;
		return [r, g, b];
	};
}

export function convertPaletteColorToRGBA(
	pixels: Uint8Array | Uint16Array,
	info: ImageInfo,
	metadata: Map<string, DICOMElement>
): Uint8ClampedArray {
	const { rows, columns } = info;
	const count = rows * columns;

	const lut = getPaletteLUT(metadata);
	if (!lut) throw new Error('Missing LUT for PALETTE COLOR image');

	const out = new Uint8ClampedArray(count * 4);

	for (let i = 0; i < count; i++) {
		const index = pixels instanceof Uint8Array || pixels instanceof Uint16Array ? pixels[i] : 0;
		const [r, g, b] = lut(index);
		const o = i * 4;
		out[o + 0] = r;
		out[o + 1] = g;
		out[o + 2] = b;
		out[o + 3] = 255;
	}

	return out;
}
