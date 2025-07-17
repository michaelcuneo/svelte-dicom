import { ByteStream } from './ByteStream.js';
import { lookupVR, isPixelData } from './DICOMDictionary.js';

export interface DataElement {
	tag: string; // e.g., '0010,0010'
	vr: string; // Value Representation, e.g., 'PN' for Person Name
	length: number; // Length of the value in bytes
	value: string | number | Uint8Array | null; // The actual value, type
}

export interface TransferSyntax {
	uid: string;
	isLittleEndian: boolean;
	isExplicitVR: boolean;
	isEncapsulated: boolean;
}

const TRANSFER_SYNTAXES: Record<string, TransferSyntax> = {
	'1.2.840.10008.1.2': {
		uid: '1.2.840.10008.1.2',
		isLittleEndian: true,
		isExplicitVR: false,
		isEncapsulated: false
	},
	'1.2.840.10008.1.2.1': {
		uid: '1.2.840.10008.1.2.1',
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: false
	},
	'1.2.840.10008.1.2.4.50': {
		uid: '1.2.840.10008.1.2.4.50',
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: true
	},
	'1.2.840.10008.1.2.4.90': {
		uid: '1.2.840.10008.1.2.4.90',
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: true
	}
};

export class DICOMParser {
	private byteStream: ByteStream;
	private transferSyntax: TransferSyntax;

	constructor(buffer: ArrayBuffer, transferSyntax?: TransferSyntax) {
		this.byteStream = new ByteStream(buffer);
		this.transferSyntax = transferSyntax ?? TRANSFER_SYNTAXES['1.2.840.10008.1.2.1'];
	}

	parseMeta(): DataElement[] {
		const metaElements: DataElement[] = [];
		this.byteStream.seek(132); // after DICM preamble
		while (true) {
			const pos = this.byteStream.getPosition();
			if (pos + 8 > this.byteStream.getLength()) break;
			const el = this.parseDataElement();
			if (!el || !el.tag.startsWith('0002,')) break;
			metaElements.push(el);
		}
		return metaElements;
	}

	parse(): DataElement[] {
		console.log('Starting parse...');
		const elements: DataElement[] = [];

		while (this.byteStream.getPosition() < this.byteStream.getLength()) {
			const before = this.byteStream.getPosition();
			const el = this.parseDataElement();
			const after = this.byteStream.getPosition();

			if (!el) {
				console.warn('Stopped: parseDataElement returned null at offset', before);
				break;
			}

			if (after === before) {
				console.warn('Stopped: no forward progress at offset', before, 'Tag:', el.tag);
				break;
			}

			if (!el) {
				console.warn('Stopped parsing: null element at offset', this.byteStream.getPosition());
				break;
			}

			console.log('Parsed tag:', el.tag, 'VR:', el.vr, 'Length:', el.length);
			elements.push(el);

			if (this.transferSyntax.isEncapsulated && isPixelData(el.tag)) {
				console.log('Stopping at encapsulated Pixel Data tag:', el.tag);
				break;
			}
		}

		console.log('Finished parsing. Total elements:', elements.length);
		return elements;
	}

	parseDataElement(): DataElement | null {
		try {
			const pos = this.byteStream.getPosition();
			const remaining = this.byteStream.getLength() - pos;
			const peekLength = Math.min(remaining, 16);
			const nextBytes =
				peekLength > 0 ? new Uint8Array(this.byteStream.view.buffer, pos, peekLength) : [];
			// Temporary logging for debugging
			console.log('Peeking ahead from offset', this.byteStream.getPosition());
			const peek = new Uint8Array(this.byteStream.view.buffer, this.byteStream.getPosition(), 16);
			console.log(
				'Next 16 bytes (hex):',
				[...peek].map((b) => b.toString(16).padStart(2, '0')).join(' ')
			);

			if (pos + 8 > this.byteStream.getLength()) return null;

			const group = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
			const element = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);

			if (Number.isNaN(group) || Number.isNaN(element)) {
				console.warn('Invalid tag encountered at offset', this.byteStream.getPosition());
				return null;
			}

			const tag =
				`${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')}`.toUpperCase();

			console.log('Tag:', tag, 'Offset:', pos, 'Next bytes:', Array.from(nextBytes));

			if (tag.startsWith('0000') || tag.startsWith('FFFE')) {
				console.warn('Suspicious system/reserved tag:', tag);
			}

			const vr = this.transferSyntax.isExplicitVR ? this.byteStream.readString(2) : lookupVR(tag);

			if (tag === 'FFFE,E0DD') {
				console.warn('End of sequence reached at', this.byteStream.getPosition());
				return null;
			}

			let length: number;

			if (this.transferSyntax.isExplicitVR && ['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
				if (this.byteStream.getPosition() + 6 > this.byteStream.getLength()) return null;
				this.byteStream.skip(2); // Reserved bytes
				length = this.byteStream.readUint32(this.transferSyntax.isLittleEndian);
			} else if (this.transferSyntax.isExplicitVR) {
				if (this.byteStream.getPosition() + 2 > this.byteStream.getLength()) return null;
				length = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
			} else {
				if (this.byteStream.getPosition() + 4 > this.byteStream.getLength()) return null;
				length = this.byteStream.readUint32(this.transferSyntax.isLittleEndian);
			}

			if (this.byteStream.getPosition() + length > this.byteStream.getLength()) return null;

			let value: string | number | Uint8Array | null = null;

			if (vr === 'SQ' && length === 0xffffffff) {
				console.warn('Skipping undefined-length sequence:', tag);
				while (this.byteStream.getPosition() + 8 <= this.byteStream.getLength()) {
					const group = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
					const element = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
					const nestedTag =
						`${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')}`.toUpperCase();
					if (nestedTag === 'FFFE,E0DD') {
						this.byteStream.skip(4); // Skip delimiter length
						break;
					}
					const itemLength = this.byteStream.readUint32(this.transferSyntax.isLittleEndian);
					this.byteStream.skip(itemLength);
				}
				return { tag, vr, length, value: null };
			}

			if (length > 0) {
				if (['OB', 'OW', 'OF', 'UN'].includes(vr)) {
					value = this.byteStream.readBytes(length);
				} else if (vr === 'PN') {
					value = this.byteStream.readString(length);
				} else if (vr === 'IS' || vr === 'DS') {
					value = parseFloat(this.byteStream.readString(length));
				} else {
					value = this.byteStream.readString(length);
				}
			}

			return { tag, vr, length, value };
		} catch (e) {
			console.error(
				'Exception during parseDataElement at offset',
				this.byteStream.getPosition(),
				e
			);
			return null; // Return null if an error occurs
		}
	}

	getTransferSyntaxFromMeta(meta: DataElement[]): TransferSyntax {
		const ts = meta
			.find((el) => el.tag === '0002,0010')
			?.value?.toString()
			.trim();
		return ts && TRANSFER_SYNTAXES[ts]
			? TRANSFER_SYNTAXES[ts]
			: TRANSFER_SYNTAXES['1.2.840.10008.1.2.1'];
	}

	isPixelData(tag: string): boolean {
		return isPixelData(tag);
	}
}
