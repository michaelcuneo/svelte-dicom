export interface DICOMElement {
	tag: string; // e.g. "0010,0010"
	vr: string; // e.g. "PN"
	length: number;
	value: Uint8Array | string | number | DICOMDataSet[];
	offset: number;
}

export type DICOMDataSet = Map<string, DICOMElement>;

export interface TransferSyntaxInfo {
	uid: string;
	name?: string;
	isImplicitVR: boolean;
	isLittleEndian: boolean;
	isEncapsulated: boolean;
}

export interface DICOMPixelData {
	tag: string;
	frames: Uint8Array[]; // Compressed or raw frames
	offsetTable?: Uint8Array;
	transferSyntax: TransferSyntaxInfo;
}

export interface ImageInfo {
	rows: number;
	columns: number;
	samplesPerPixel: number;
	photometricInterpretation: string;
	bitsAllocated: number;
	bitsStored: number;
	highBit: number;
	pixelRepresentation: 0 | 1;
	planarConfiguration?: number;
	frameCount: number;
}
