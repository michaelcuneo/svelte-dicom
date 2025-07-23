export function unpack12Bit(data: Uint8Array): Uint16Array {
	const length = Math.floor(data.length / 3) * 2;
	const output = new Uint16Array(length);
	let inIdx = 0;
	let outIdx = 0;

	while (inIdx + 2 < data.length) {
		const b0 = data[inIdx++];
		const b1 = data[inIdx++];
		const b2 = data[inIdx++];

		output[outIdx++] = (b0 << 4) | (b1 >> 4); // First 12-bit sample
		output[outIdx++] = ((b1 & 0x0f) << 8) | b2; // Second 12-bit sample
	}

	return output;
}

export function unpack10Bit(data: Uint8Array): Uint16Array {
	const length = Math.floor((data.length * 8) / 10);
	const output = new Uint16Array(length);
	let bitOffset = 0;
	let byteOffset = 0;
	let outIdx = 0;

	const totalBits = data.length * 8;

	while (bitOffset + 10 <= totalBits) {
		const bitsAvailable = 8 - (bitOffset % 8);

		if (bitsAvailable >= 10) {
			// fits in current + next byte
			const value =
				(((data[byteOffset] << 8) | data[byteOffset + 1]) >> (6 - (bitOffset % 8))) & 0x3ff;
			output[outIdx++] = value;
			bitOffset += 10;
			byteOffset = Math.floor(bitOffset / 8);
		} else {
			// crosses 3 bytes
			const b = (data[byteOffset] << 16) | (data[byteOffset + 1] << 8) | data[byteOffset + 2];
			const shift = 14 - (bitOffset % 8);
			output[outIdx++] = (b >> shift) & 0x3ff;
			bitOffset += 10;
			byteOffset = Math.floor(bitOffset / 8);
		}
	}

	return output;
}
