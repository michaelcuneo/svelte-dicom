import type { ImageInfo, DICOMElement } from '../../types/types.js';

export function applyVOILinear(value: number, windowCenter: number, windowWidth: number): number {
	if (windowWidth < 1) windowWidth = 1;
	const min = windowCenter - 0.5 - (windowWidth - 1) / 2;
	const max = windowCenter - 0.5 + (windowWidth - 1) / 2;

	if (value <= min) return 0;
	if (value > max) return 255;
	return Math.round(((value - min) / (max - min)) * 255);
}

export function applyVOILUT(
	pixelData: Uint8Array | Uint16Array | Int16Array,
	info: ImageInfo,
	metadata: Map<string, DICOMElement>
): Uint8ClampedArray {
	const { rows, columns } = info;
	const count = rows * columns;
	const out = new Uint8ClampedArray(count);

	const voiLUT = metadata.get('0028,3010'); // VOI LUT Sequence
	const windowCenterElement = metadata.get('0028,1050');
	const windowCenter =
		windowCenterElement && Array.isArray(windowCenterElement.value)
			? parseFloat(String(windowCenterElement.value[0]))
			: 40;
	const windowWidthElement = metadata.get('0028,1051');
	const windowWidth =
		windowWidthElement && Array.isArray(windowWidthElement.value)
			? parseFloat(String(windowWidthElement.value[0]))
			: 400;

	let lut: Uint16Array | undefined;
	let firstMapped = 0;
	let numEntries = 0;

	if (voiLUT && Array.isArray(voiLUT.value) && voiLUT.value.length > 0) {
		const lutItem = voiLUT.value[0] as Map<string, DICOMElement>;

		const lutDataElement = lutItem.get('0028,3006'); // LUT Data
		const descriptor = (lutItem.get('0028,3002')?.value ?? [0, 0, 0]) as number[];

		numEntries = descriptor[0] || 0;
		firstMapped = descriptor[2] || 0;

		if (
			lutDataElement?.value instanceof Uint8Array ||
			lutDataElement?.value instanceof Uint16Array
		) {
			lut = new Uint16Array(
				lutDataElement.value.buffer,
				lutDataElement.value.byteOffset,
				numEntries
			);
		}
	}

	for (let i = 0; i < count; i++) {
		let raw: number;
		if (
			pixelData instanceof Uint8Array ||
			pixelData instanceof Uint16Array ||
			pixelData instanceof Int16Array
		) {
			raw = pixelData[i];
		} else {
			throw new Error('Unsupported pixelData type');
		}

		let value: number;

		if (lut) {
			const lutIndex = raw - firstMapped;
			value = lutIndex >= 0 && lutIndex < numEntries ? lut[lutIndex] : 0;
			value = scaleTo8bit(value, 16); // LUT usually 16-bit output
		} else {
			value = applyVOILinear(raw, windowCenter, windowWidth);
		}

		out[i] = value;
	}

	return out;
}

function scaleTo8bit(v: number, bitsIn: number): number {
	const maxIn = (1 << bitsIn) - 1;
	return Math.round((v / maxIn) * 255);
}
