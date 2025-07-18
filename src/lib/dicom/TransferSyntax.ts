export interface TransferSyntax {
	uid: string;
	isLittleEndian: boolean;
	isExplicitVR: boolean;
	isEncapsulated: boolean;
}

export const TRANSFER_SYNTAXES: Record<string, TransferSyntax> = {
	'1.2.840.10008.1.2': {
		uid: '1.2.840.10008.1.2', // Implicit VR Little Endian
		isLittleEndian: true,
		isExplicitVR: false,
		isEncapsulated: false
	},
	'1.2.840.10008.1.2.1': {
		uid: '1.2.840.10008.1.2.1', // Explicit VR Little Endian
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: false
	},
	'1.2.840.10008.1.2.4.50': {
		uid: '1.2.840.10008.1.2.4.50', // JPEG Baseline (Process 1)
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: true
	},
	'1.2.840.10008.1.2.4.90': {
		uid: '1.2.840.10008.1.2.4.90', // JPEG 2000 (Lossless)
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: true
	}
};

export function getTransferSyntax(uid: string): TransferSyntax {
	return TRANSFER_SYNTAXES[uid] ?? TRANSFER_SYNTAXES['1.2.840.10008.1.2.1']; // fallback: Explicit VR Little
}
