export interface TransferSyntax {
	uid: string; // Unique identifier for the transfer syntax
	isLittleEndian: boolean; // Indicates if the transfer syntax is little-endian
	isExplicitVR: boolean; // Indicates if the transfer syntax uses explicit VR
	isEncapsulated: boolean; // Indicates if the transfer syntax is encapsulated
}

export const TRANSFER_SYNTAXES: Record<string, TransferSyntax> = {
	'1.2.840.10008.1.2': {
		uid: '1.2.840.10008.1.2',
		isLittleEndian: true,
		isExplicitVR: false,
		isEncapsulated: false
	}, // Implicit VR LE
	'1.2.840.10008.1.2.1': {
		uid: '1.2.840.10008.1.2.1',
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: false
	}, // Explicit VR LE
	'1.2.840.10008.1.2.4.50': {
		uid: '1.2.840.10008.1.2.4.50',
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: true
	}, // JPEG Baseline
	'1.2.840.10008.1.2.4.90': {
		uid: '1.2.840.10008.1.2.4.90',
		isLittleEndian: true,
		isExplicitVR: true,
		isEncapsulated: true
	} // JPEG 2000
};
