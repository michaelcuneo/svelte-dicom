import rawDictionary from './dicom-dictionary.js';
import type { DICOMEntry } from './dicom-dictionary.js';

const dictionary: DICOMEntry[] = Object.values(rawDictionary);
const tagMap: Record<string, DICOMEntry> = {};

for (const entry of dictionary as DICOMEntry[]) {
	tagMap[entry.tag.toUpperCase()] = entry;
}

export const lookupVR = (tag: string): string => {
	return tagMap[tag.toUpperCase()]?.vr || 'UN'; // Return 'UN' if not found
};

export const getElementKeyword = (tag: string): string => {
	return tagMap[tag.toUpperCase()]?.name || `Unknown (${tag})`; // Return a default message if not found
};

export const isPixelData = (tag: string): boolean => {
	return tag.toUpperCase() === '(7FE0,0010)' ? true : false;
};
