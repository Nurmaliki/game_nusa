/**
 * Build / version metadata surfaced in Settings → About (see §55).
 */
export const GAME_VERSION = '1.0.0';
export const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'dev';
export const CURRENT_SCHEMA_VERSION = 2;
