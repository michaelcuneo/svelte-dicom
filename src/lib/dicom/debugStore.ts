import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

export const logs: Writable<Logger[]> = writable<Logger[]>([]);
export const visible: Writable<boolean> = writable(false);
export const filters = writable({ level: 'all', category: 'all' });

export type Logger = {
	id: number;
	text?: string;
	timestamp?: string;
	level: 'all' | 'info' | 'warn' | 'error' | 'debug' | 'success' | string;
	raw?: string | object;
	category: string;
	isObject?: boolean;
};

let counter = 0;

export function debugLog(message: string, { level = 'info', category = 'general' } = {}) {
	const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
	const text = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
	const isObject = typeof message === 'object';

	logs.update((arr) => [
		...arr.slice(-199),
		{
			id: counter++,
			timestamp,
			text,
			level,
			category,
			raw: message,
			isObject
		}
	]);
}
