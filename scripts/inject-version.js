#!/usr/bin/env node
// Injects APP_VERSION into version.ts before build
const fs = require('fs')
const path = require('path')

const version = process.env.APP_VERSION || '1.2.0'
const versionFile = path.join(__dirname, '..', 'version.ts')

const content = `// Auto-generated - do not edit manually
// Injected at build time by scripts/inject-version.js
export const APP_VERSION = '${version}'
`

fs.writeFileSync(versionFile, content)
console.log('Injected APP_VERSION:', version)
