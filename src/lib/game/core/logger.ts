/**
 * Categorised logger (see §56).
 * Development: verbose. Production: warnings/errors only.
 * NEVER log sensitive data. NEVER log per-frame.
 */
export type LogCategory = 'GAME' | 'SAVE' | 'WORLD' | 'QUEST' | 'ASSET';

const isDev = import.meta.env.DEV;

function format(category: LogCategory, message: string): string {
	return `[Nusantara/${category}] ${message}`;
}

export const log = {
	debug(category: LogCategory, message: string, ...args: unknown[]): void {
		if (isDev) console.debug(format(category, message), ...args);
	},
	info(category: LogCategory, message: string, ...args: unknown[]): void {
		if (isDev) console.info(format(category, message), ...args);
	},
	warn(category: LogCategory, message: string, ...args: unknown[]): void {
		console.warn(format(category, message), ...args);
	},
	error(category: LogCategory, message: string, ...args: unknown[]): void {
		console.error(format(category, message), ...args);
	}
};
