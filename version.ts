// CI sets APP_VERSION via environment variable (git describe --tags)
export const APP_VERSION = process.env.APP_VERSION || '1.2.0'
