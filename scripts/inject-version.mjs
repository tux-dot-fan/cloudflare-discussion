#!/usr/bin/env node
// Injects APP_VERSION into version.ts before build
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const version = process.env.APP_VERSION || '1.2.0'
const versionFile = path.join(__dirname, '..', 'version.ts')

const content = `// Auto-generated - do not edit manually
// Injected at build time by scripts/inject-version.mjs
export const APP_VERSION = '${version}'
`

fs.writeFileSync(versionFile, content)
console.log('Injected APP_VERSION:', version)
