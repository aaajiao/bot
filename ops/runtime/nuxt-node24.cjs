'use strict'

// Nuxt2.14's esm3 hook is incompatible with Node24. Load the project's CommonJS
// config natively; Nuxt's already-installed jiti handles its ESM-style modules.
const path = require('path')
const fs = require('fs')
const { createRequire } = require('module')
const { Nuxt, loadNuxtConfig } = require('nuxt')
const nativeRequire = module => createRequire(module.filename)

function allowLegacyBuildMetadata(nuxt) {
  // Nuxt's build-time version check reads these old packages' metadata. Their
  // obsolete exports wildcards no longer expose package.json on current Node.
  // Resolve only those metadata files from public entries; do not change imports.
  const requireModule = nuxt.resolver.requireModule.bind(nuxt.resolver)
  nuxt.resolver.requireModule = (name, options) => {
    try { return requireModule(name, options) } catch (error) {
      if (!['@nuxt/ufo/package.json', 'vuex/package.json'].includes(name) || error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error
      const packageName = name.slice(0, -'/package.json'.length)
      const metadataPath = path.resolve(path.dirname(require.resolve(packageName)), '../package.json')
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
      if (metadata.name !== packageName) throw error
      return metadata
    }
  }
}

async function loadConfig(mode) {
  if (!['build', 'start'].includes(mode)) throw new Error('Use build or start.')
  process.env.NODE_ENV = 'production'
  const port = process.env.PORT === undefined ? 3000 : Number(process.env.PORT)
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT.')
  return loadNuxtConfig({
    rootDir: path.resolve(__dirname, '../..'),
    createRequire: nativeRequire,
    configOverrides: {
      dev: false,
      createRequire: 'jiti',
      _build: mode === 'build',
      _start: mode === 'start',
      server: mode === 'build' ? false : { host: process.env.HOST || '0.0.0.0', port }
    }
  })
}

async function run(mode) {
  const config = await loadConfig(mode)
  const nuxt = new Nuxt(config)
  try {
    await nuxt.ready()
    if (mode === 'build') {
      const { Builder } = require('nuxt')
      allowLegacyBuildMetadata(nuxt)
      try { await new Builder(nuxt).build() } finally { await nuxt.close() }
      return
    }
    await nuxt.listen()
    let closing = false
    const shutdown = async () => {
      if (closing) return
      closing = true
      const timeout = setTimeout(() => process.exit(1), 10000)
      timeout.unref()
      try { await nuxt.close(); process.exit(0) } catch (error) { process.exit(1) }
    }
    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
  } catch (error) {
    await nuxt.close().catch(() => {})
    throw error
  }
}

module.exports = { loadConfig, run, allowLegacyBuildMetadata }
if (require.main === module) {
  run(process.argv[2] || 'start').catch(error => {
    console.error(error.stack || error.message)
    process.exit(1)
  })
}
