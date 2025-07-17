import dictionary from "./dictionary.js";

export function lookupVR(tag: string): string {
  const entry = dictionary[tag];
  if (entry) {
    return entry.name;
  }
  return tag; // Return the original VR if not found
}

export function getElementName(tag: string): string {
  const entry = dictionary[tag];
  if (entry) {
    return entry.name;
  }
  return `Unknown (${tag})`; // Return a default message if not found
}