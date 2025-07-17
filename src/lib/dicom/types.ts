// CORE
export interface DataElement {
	tag: string; // e.g., '0010,0010'
	vr: string; // Value Representation, e.g., 'PN' for Person Name
	length: number; // Length of the value in bytes
	value: string | number | Uint8Array | null; // The actual value, type depends on vr
}

export interface DataSet {
	elements: DataElement[]; // Array of DataElements
}

export interface TransferSyntax {
	uid: string; // Unique identifier for the transfer syntax
	isLittleEndian: boolean;
	isExplicitVR: boolean;
	isEncapsulated: boolean;
}

// BYTE STREAM
export class ByteStream {
	private view: DataView;
	private offset: number = 0;

	constructor(private buffer: ArrayBuffer) {
		this.view = new DataView(buffer);
	}

	readUint8(): number {
		return this.view.getUint8(this.offset++);
	}

	readUint16(le: boolean): number {
		const val = this.view.getUint16(this.offset, le);
		this.offset += 2;
		return val;
	}

	readUint32(le: boolean): number {
		const val = this.view.getUint32(this.offset, le);
		this.offset += 4;
		return val;
	}

	readString(length: number): string {
		let str = '';
		for (let i = 0; i < length; i++) {
			str += String.fromCharCode(this.readUint8());
		}
		return str;
	}

	readBytes(length: number): Uint8Array {
		const bytes = new Uint8Array(this.buffer, this.offset, length);
		this.offset += length;
		return bytes;
	}

	skip(bytes: number) {
		this.offset += bytes;
	}

	getPosition() {
		return this.offset;
	}

	getLength() {
		return this.view.byteLength;
	}
}
