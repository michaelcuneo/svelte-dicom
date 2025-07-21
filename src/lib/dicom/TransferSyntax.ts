import type { TransferSyntaxInfo } from './types.js';

export const TRANSFER_SYNTAX_MAP: Record<string, Partial<TransferSyntaxInfo>> = {
	'1.2.840.10008.1.2': {
		isLittleEndian: true,
		isImplicitVR: false,
		isEncapsulated: false,
		name: 'Implicit VR Little Endian'
	},
	'1.2.840.10008.1.2.1': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: false,
		name: 'Explicit VR Little Endian'
	},
	'1.2.840.10008.1.2.1.99': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'Explicit VR Big Endian'
	},
	'1.2.840.10008.1.2.2': {
		isLittleEndian: false,
		isImplicitVR: true,
		isEncapsulated: false,
		name: 'Explicit VR Big Endian'
	},
	'1.2.840.10008.1.2.4.50': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG Baseline (Process 1)'
	},
	'1.2.840.10008.1.2.4.51': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG Extended (Process 2 & 4)'
	},
	'1.2.840.10008.1.2.4.57': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG Lossless, Non-hierarchical (Process 14)'
	},
	'1.2.840.10008.1.2.4.70': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG Lossless, Non-hierarchical (Process 14 [Selection Value 1])'
	},
	'1.2.840.10008.1.2.4.80': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG-LS Lossless (Process 1)'
	},
	'1.2.840.10008.1.2.4.81': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG-LS Lossy (Process 2)'
	},
	'1.2.840.10008.1.2.4.90': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Image Compression (Lossless, Process 1)'
	},
	'1.2.840.10008.1.2.4.91': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Image Compression (Lossy, Process 2)'
	},
	'1.2.840.10008.1.2.4.92': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Image Compression (Lossless, Process 3)'
	},
	'1.2.840.10008.1.2.4.93': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Image Compression (Lossy, Process 4)'
	},
	'1.2.840.10008.1.2.5': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'RLE Lossless'
	},
	'1.2.840.10008.1.2.4.100': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 1)'
	},
	'1.2.840.10008.1.2.4.101': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossy, Process 2)'
	},
	'1.2.840.10008.1.2.4.102': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 3)'
	},
	'1.2.840.10008.1.2.4.103': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossy, Process 4)'
	},
	'1.2.840.10008.1.2.4.104': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 5)'
	},
	'1.2.840.10008.1.2.4.105': {
		uid: '1.2.840.10008.1.2.4.105',
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossy, Process 6)'
	},
	'1.2.840.10008.1.2.4.106': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 7)'
	},
	'1.2.840.10008.1.2.4.107': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 7)'
	},
	'1.2.840.10008.1.2.4.108': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossy, Process 8)'
	},
	'1.2.840.10008.1.2.7.1': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 9)'
	},
	'1.2.840.10008.1.2.7.2': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossy, Process 10)'
	},
	'1.2.840.10008.1.2.7.3': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 11)'
	},
	'1.2.840.10008.1.2.1.1001': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossy, Process 12)'
	},
	'1.2.840.10008.1.2.4.52': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 12)'
	},
	'1.2.840.10008.1.2.4.58': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 12)'
	},
	'1.2.840.10008.1.2.6.1': {
		uid: '1.2.840.10008.1.2.6.1',
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 12)'
	},
	'1.2.840.10008.1.2.6.2': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'JPEG 2000 Part 1 (Lossless, Process 12)'
	},
	'9.9.999.1.1': {
		isLittleEndian: true,
		isImplicitVR: true,
		isEncapsulated: true,
		name: 'Custom Little Endian Transfer Syntax'
	},
	'9.9.999.1.2': {
		isLittleEndian: false,
		isImplicitVR: true,
		isEncapsulated: false,
		name: 'Custom Big Endian Transfer Syntax'
	}
};

export function getTransferSyntaxInfo(uid: string): TransferSyntaxInfo {
	const base: Partial<TransferSyntaxInfo> = TRANSFER_SYNTAX_MAP[uid] || {};
	return {
		uid,
		isImplicitVR: base.isImplicitVR ?? false,
		isLittleEndian: base.isLittleEndian ?? true,
		isEncapsulated: base.isEncapsulated ?? false,
		name: base.name
	};
}
