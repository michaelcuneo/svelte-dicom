import { writable } from 'svelte/store';

export const logs = writable([]);
export const visible = writable(false);
export const filters = writable({ level: 'all', category: 'all' });

let counter = 0;

/**
 * Log to the debug console.
 * @param message - String or object to log
 * @param options - { level: 'info' | 'warn' | 'error' | 'debug' | 'success', category: string }
 */
export function debugLog(message: any, { level = 'info', category = 'general' } = {}) {
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
