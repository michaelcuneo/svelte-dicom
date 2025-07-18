export class ByteStream {
	private view: DataView;
	private pos: number;

	constructor(private buffer: ArrayBuffer) {
		this.view = new DataView(buffer);
		this.pos = 0;
	}

	getPosition(): number {
		return this.pos;
	}

	getLength(): number {
		return this.buffer.byteLength;
	}

	seek(position: number) {
		this.pos = position;
	}

	skip(offset: number) {
		this.pos += offset;
	}

	readUint16(littleEndian = true): number {
		const val = this.view.getUint16(this.pos, littleEndian);
		this.pos += 2;
		return val;
	}

	readUint32(littleEndian = true): number {
		const val = this.view.getUint32(this.pos, littleEndian);
		this.pos += 4;
		return val;
	}

	readString(length: number): string {
		const bytes = new Uint8Array(this.buffer, this.pos, length);
		this.pos += length;
		return new TextDecoder().decode(bytes).replace(/\0+$/, '');
	}

	readBytes(length: number): Uint8Array {
		const bytes = new Uint8Array(this.buffer, this.pos, length);
		this.pos += length;
		return bytes;
	}
}
