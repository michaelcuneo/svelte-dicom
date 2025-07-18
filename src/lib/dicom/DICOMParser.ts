import { ByteStream } from './ByteStream.js';
import { getTransferSyntax } from './TransferSyntax.js';
import { lookupVR, isPixelData } from './DICOMDictionary.js';

export interface DataElement {
	tag: string;
	vr: string;
	length: number;
	value: string | number | Uint8Array | null;
}

export interface TransferSyntax {
	uid: string;
	isLittleEndian: boolean;
	isExplicitVR: boolean;
	isEncapsulated: boolean;
}

export class DICOMParser {
	public byteStream: ByteStream;
	private transferSyntax: TransferSyntax;

	constructor(buffer: ArrayBuffer, transferSyntax?: TransferSyntax) {
		this.byteStream = new ByteStream(buffer);
		this.transferSyntax = transferSyntax ?? getTransferSyntax('1.2.840.10008.1.2.1');
	}

	parseMeta(): DataElement[] {
		const metaElements: DataElement[] = [];
		this.byteStream.seek(132); // skip preamble + "DICM"
		while (true) {
			const el = this.parseDataElement();
			if (!el || !el.tag.startsWith('0002,')) break;
			metaElements.push(el);
		}
		return metaElements;
	}

	getOffset(): number {
		return this.byteStream.getPosition();
	}

	getTransferSyntaxFromMeta(meta: DataElement[]): TransferSyntax {
		const uid = meta
			.find((el) => el.tag === '0002,0010')
			?.value?.toString()
			.trim();
		return getTransferSyntax(uid ?? '');
	}

	parse(): DataElement[] {
		const elements: DataElement[] = [];
		while (this.byteStream.getPosition() < this.byteStream.getLength()) {
			const before = this.byteStream.getPosition();
			const el = this.parseDataElement();
			const after = this.byteStream.getPosition();

			if (!el || after === before) break;

			elements.push(el);
			if (this.transferSyntax.isEncapsulated && isPixelData(el.tag)) {
				console.log('Found encapsulated Pixel Data tag:', el.tag);
				elements.push(el);
			}
		}
		return elements;
	}

	parseDataElement(): DataElement | null {
		try {
			const pos = this.byteStream.getPosition();
			if (pos + 8 > this.byteStream.getLength()) return null;

			const group = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
			const element = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
			const tag =
				`${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')}`.toUpperCase();

			if (tag === 'FFFE,E0DD') return null;

			let vr = this.transferSyntax.isExplicitVR ? this.byteStream.readString(2) : lookupVR(tag);
			if (!vr) vr = 'UN';

			let length: number;
			if (this.transferSyntax.isExplicitVR && ['OB', 'OW', 'SQ', 'UN'].includes(vr)) {
				this.byteStream.skip(2);
				length = this.byteStream.readUint32(this.transferSyntax.isLittleEndian);
			} else if (this.transferSyntax.isExplicitVR) {
				length = this.byteStream.readUint16(this.transferSyntax.isLittleEndian);
			} else {
				length = this.byteStream.readUint32(this.transferSyntax.isLittleEndian);
			}

			if (length === 0xffffffff) {
				// undefined-length sequence — skip
				return { tag, vr, length, value: null };
			}

			if (this.byteStream.getPosition() + length > this.byteStream.getLength()) return null;

			const bytes = this.byteStream.readBytes(length);
			const value = this.decodeValue(bytes, vr);

			return { tag, vr, length, value };
		} catch (e) {
			console.error('Error parsing element:', e);
			return null;
		}
	}

	private decodeValue(bytes: Uint8Array, vr: string): string | number | Uint8Array | null {
		const littleEndian = this.transferSyntax.isLittleEndian;
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

		switch (vr) {
			case 'US':
				return bytes.length === 2 ? view.getUint16(0, littleEndian) : null;
			case 'UL':
				return bytes.length === 4 ? view.getUint32(0, littleEndian) : null;
			case 'SS':
				return bytes.length === 2 ? view.getInt16(0, littleEndian) : null;
			case 'SL':
				return bytes.length === 4 ? view.getInt32(0, littleEndian) : null;
			case 'FL':
				return bytes.length === 4 ? view.getFloat32(0, littleEndian) : null;
			case 'FD':
				return bytes.length === 8 ? view.getFloat64(0, littleEndian) : null;
			case 'OB':
			case 'OW':
			case 'UN':
				return bytes;
			case 'IS':
			case 'DS':
			case 'PN':
			case 'LO':
			case 'SH':
			case 'DA':
			case 'TM':
			default: {
				const text = new TextDecoder().decode(bytes).trim();
				// eslint-disable-next-line no-control-regex
				if (/[\x00-\x08\x0E-\x1F]/.test(text)) return null;
				return text;
			}
		}
	}
}
