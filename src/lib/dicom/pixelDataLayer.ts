// PixelDataLayer.ts

import type { DICOMDataSet, DICOMPixelData, TransferSyntaxInfo } from './types.js';

/**
 * Extracts the raw pixel data element from a dataset.
 * Handles native and encapsulated pixel data (Basic Offset Table + fragments).
 */
export function extractPixelData(
	dataSet: DICOMDataSet,
	transferSyntax: TransferSyntaxInfo
): DICOMPixelData | undefined {
	const pixelElement = dataSet.get('7fe0,0010');
	if (!pixelElement || !(pixelElement.value instanceof Uint8Array)) return undefined;

	const buffer = new DataView(
		pixelElement.value.buffer,
		pixelElement.value.byteOffset,
		pixelElement.value.byteLength
	);

	const frames: Uint8Array[] = [];

	if (!transferSyntax.isEncapsulated) {
		// Native (uncompressed): Single frame blob
		frames.push(pixelElement.value);
	} else {
		// Encapsulated: Fragments with Basic Offset Table
		let offset = 0;
		const fragments: Uint8Array[] = [];

		while (offset + 8 <= buffer.byteLength) {
			const tagGroup = buffer.getUint16(offset, true);
			const tagElement = buffer.getUint16(offset + 2, true);
			const itemTag = `${tagGroup.toString(16)},${tagElement.toString(16)}`;
			const length = buffer.getUint32(offset + 4, true);
			offset += 8;

			if (itemTag === 'fffe,e000') {
				const fragment = new Uint8Array(buffer.buffer, buffer.byteOffset + offset, length);
				fragments.push(fragment);
				offset += length;
			} else if (itemTag === 'fffe,e0dd') {
				break; // Sequence Delimitation Item
			} else {
				throw new Error('Unexpected item tag in pixel data: ' + itemTag);
			}
		}

		const offsetTable = fragments.shift();
		fragments.forEach((f) => frames.push(f));

		return {
			tag: pixelElement.tag,
			frames,
			offsetTable,
			transferSyntax
		};
	}

	return {
		tag: pixelElement.tag,
		frames,
		transferSyntax
	};
}
