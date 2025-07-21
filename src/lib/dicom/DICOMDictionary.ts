import rawDictionary from './dicom-dictionary.js';
import type { DICOMEntry } from './dicom-dictionary.js';

const dictionary: DICOMEntry[] = Object.values(rawDictionary);
const tagMap: Record<string, DICOMEntry> = {};

for (const entry of dictionary as DICOMEntry[]) {
	tagMap[entry.tag.replace(/[()]/g, '').toUpperCase()] = entry;
}

export const lookupVR = (tag: string): string => {
	const cleanTag = tag.replace(/[()]/g, '').toUpperCase();
	return tagMap[cleanTag]?.vr || 'UN';
};

export const getElementKeyword = (tag: string): string => {
	const cleanTag = tag.replace(/[()]/g, '').toUpperCase();
	return tagMap[cleanTag]?.name || `Unknown (${tag})`;
};

export const isPixelData = (tag: string): boolean => {
	const cleanTag = tag.replace(/[()]/g, '').toUpperCase();
	return cleanTag === '7FE00010' ? true : false;
};
