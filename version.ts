// Injected at deploy time via wrangler --define or CI env
// For local dev, falls back to '1.2.0'
export const APP_VERSION = (globalThis as any).__APP_VERSION__ || '1.2.0'
