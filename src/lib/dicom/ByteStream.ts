export class ByteStream {
	private buffer: ArrayBuffer;
	public view: DataView;
	private offset: number = 0;

	constructor(buffer: ArrayBuffer) {
		this.buffer = buffer;
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

	seek(position: number): void {
		if (position < 0 || position > this.buffer.byteLength) {
			throw new RangeError('Seek position out of bounds');
		}
		this.offset = position;
	}
}
