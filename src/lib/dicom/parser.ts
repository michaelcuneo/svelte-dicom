import DICOMDictionary from './dicom-dictionary.js';

const tagMap: Record<string, string> = {};

export const lookupVR = (tag: string): string => {
	const entry = DICOMDictionary[tag].vr;
	if (entry) {
		return entry.name;
	}
	return tag; // Return the original VR if not found
};

export const getElementName = (tag: string): string => {
	const entry = DICOMDictionary[tag].name;
	if (entry) {
		return entry.name;
	}
	return `Unknown (${tag})`; // Return a default message if not found
};

export const getElementKeyword = (tag: string): string => {
	const entry = DICOMDictionary[tag].keyword;
	if (entry) {
		return entry.keyword;
	}
	return `Unknown (${tag})`; // Return a default message if not found
};
