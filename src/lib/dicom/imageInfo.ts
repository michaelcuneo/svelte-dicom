// ImageInfo.ts

import type { DICOMDataSet, ImageInfo } from './types.js';

export function extractImageInfo(dataSet: DICOMDataSet): ImageInfo {
	const getString = (tag: string): string => {
		const element = dataSet.get(tag);
		return element?.value instanceof Uint8Array
			? new TextDecoder().decode(element.value).trim()
			: String(element?.value ?? '');
	};

	const getUint = (tag: string): number => {
		const element = dataSet.get(tag);
		if (!element) return 0;
		if (typeof element.value === 'number') return element.value;
		if (element.value instanceof Uint8Array) {
			const view = new DataView(
				element.value.buffer,
				element.value.byteOffset,
				element.value.byteLength
			);
			return view.getUint16(0, true);
		}
		return parseInt(element.value as string);
	};

	const getOptionalUint = (tag: string): number | undefined => {
		const val = getUint(tag);
		return isNaN(val) ? undefined : val;
	};

	return {
		rows: getUint('0028,0010'),
		columns: getUint('0028,0011'),
		samplesPerPixel: getUint('0028,0002'),
		photometricInterpretation: getString('0028,0004'),
		bitsAllocated: getUint('0028,0100'),
		bitsStored: getUint('0028,0101'),
		highBit: getUint('0028,0102'),
		pixelRepresentation: getUint('0028,0103') as 0 | 1,
		planarConfiguration: getOptionalUint('0028,0006'),
		frameCount: getOptionalUint('0028,0008') || 1
	};
}
