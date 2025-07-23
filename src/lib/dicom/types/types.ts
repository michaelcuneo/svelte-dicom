export interface DICOMElement {
	tag: string; // e.g. "0010,0010"
	vr: string; // e.g. "PN"
	length: number;
	value: Uint8Array | string | number | DICOMDataSet[] | null;
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

export interface DecodedFrame {
	width: number;
	height: number;
	data: Uint8Array | Uint16Array | Int16Array;
}

export interface PixelInfo {
	bitmaps: ImageBitmap[];
	frames: DecodedFrame[];
	width: number;
	height: number;
	framesCount: number;
	imageInfo: ImageInfo;
	photometricInterpretation: string;
}

export type Logger = {
	id: number;
	text?: string;
	timestamp?: string;
	level: 'all' | 'info' | 'warn' | 'error' | 'debug' | 'success' | string;
	raw?: string | object;
	category: string;
	isObject?: boolean;
};
