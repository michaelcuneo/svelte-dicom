import type { DICOMDataSet } from '../../types/types.js';

export function parseDataSet(
	buffer: DataView,
	startOffset = 0,
	isLittleEndian = true,
	isImplicitVR = false
): [DICOMDataSet, number] {
	const elements: DICOMDataSet = new Map();
	let offset = startOffset;

	while (offset + 6 < buffer.byteLength) {
		const tagGroup = buffer.getUint16(offset, isLittleEndian);
		const tagElement = buffer.getUint16(offset + 2, isLittleEndian);
		const tag = `${tagGroup.toString(16).padStart(4, '0')},${tagElement.toString(16).padStart(4, '0')}`;
		offset += 4;

		let vr = '';
		let length = 0;

		if (!isImplicitVR) {
			vr = String.fromCharCode(buffer.getUint8(offset), buffer.getUint8(offset + 1));
			offset += 2;
			if (['OB', 'OW', 'SQ', 'UN', 'UT'].includes(vr)) {
				offset += 2; // reserved
				length = buffer.getUint32(offset, isLittleEndian);
				offset += 4;
			} else {
				length = buffer.getUint16(offset, isLittleEndian);
				offset += 2;
			}
		} else {
			vr = inferVR(tag); // fallback
			length = buffer.getUint32(offset, isLittleEndian);
			offset += 4;
		}

		const valueOffset = offset;
		let value: Uint8Array | DICOMDataSet[] | null;

		if (vr === 'SQ') {
			const [items, nextOffset] = parseSequence(
				buffer,
				offset,
				length,
				isLittleEndian,
				isImplicitVR
			);
			value = items;
			offset = nextOffset;
		} else {
			value = new Uint8Array(buffer.buffer, buffer.byteOffset + offset, length);
			offset += length;
		}

		elements.set(tag, {
			tag,
			vr,
			length,
			value,
			offset: valueOffset
		});
	}

	return [elements, offset];
}

function parseSequence(
	buffer: DataView,
	startOffset: number,
	length: number,
	isLittleEndian: boolean,
	isImplicitVR: boolean
): [DICOMDataSet[], number] {
	const items: DICOMDataSet[] = [];
	let offset = startOffset;
	const end = length === 0xffffffff ? buffer.byteLength : startOffset + length;

	while (offset + 8 <= end) {
		const itemTagGroup = buffer.getUint16(offset, isLittleEndian);
		const itemTagElement = buffer.getUint16(offset + 2, isLittleEndian);
		const itemTag = `${itemTagGroup.toString(16)},${itemTagElement.toString(16)}`;

		if (itemTag === 'fffe,e0dd') break; // Sequence Delimitation Item
		if (itemTag !== 'fffe,e000') throw new Error('Unexpected tag inside sequence: ' + itemTag);

		const itemLength = buffer.getUint32(offset + 4, isLittleEndian);
		offset += 8;

		const [nested, newOffset] = parseDataSet(buffer, offset, isLittleEndian, isImplicitVR);

		items.push(nested);
		offset = itemLength === 0xffffffff ? newOffset + 8 : offset + itemLength;
	}

	return [items, offset + 8];
}

function inferVR(tag: string): string {
	// Basic heuristic or fallback mapping (extend with dictionary if needed)
	if (tag.startsWith('60')) return 'OW';
	if (tag === '7fe0,0010') return 'OB';
	return 'UN'; // unknown
}
