'use strict'

// Offline checks: no Nuxt server, database, credentials, or business requests.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { loadConfig, allowLegacyBuildMetadata } = require('./nuxt-node24.cjs')

test('Nuxt startup preserves native dynamic import used by the MongoDB handshake', async () => {
  assert.equal(process.env.DISABLE_V8_COMPILE_CACHE, '1')
  require('jiti')(__filename)
  const driver = path.dirname(require.resolve('mongodb/package.json'))
  const { resolveRuntimeAdapters } = require(path.join(driver, 'lib/runtime_adapters.js'))
  const runtime = await resolveRuntimeAdapters({})
  assert.equal(typeof runtime.os.platform, 'function')
  assert.equal(runtime.os.platform(), process.platform)
})

test('start config is production with an explicit container listener', async () => {
  const oldHost = process.env.HOST
  const oldPort = process.env.PORT
  delete process.env.HOST
  delete process.env.PORT
  try {
    const config = await loadConfig('start')
    assert.equal(process.env.NODE_ENV, 'production')
    assert.equal(config.dev, false)
    assert.equal(config.createRequire, 'jiti')
    assert.equal(config.server.host, '0.0.0.0')
    assert.equal(config.server.port, 3000)
    assert.equal(config._start, true)
  } finally {
    if (oldHost === undefined) delete process.env.HOST; else process.env.HOST = oldHost
    if (oldPort === undefined) delete process.env.PORT; else process.env.PORT = oldPort
  }
})

test('explicit HOST and PORT overrides survive config loading', async () => {
  const oldHost = process.env.HOST
  const oldPort = process.env.PORT
  process.env.HOST = '127.0.0.1'
  process.env.PORT = '31337'
  try {
    const config = await loadConfig('start')
    assert.equal(config.server.host, '127.0.0.1')
    assert.equal(config.server.port, 31337)
  } finally {
    if (oldHost === undefined) delete process.env.HOST; else process.env.HOST = oldHost
    if (oldPort === undefined) delete process.env.PORT; else process.env.PORT = oldPort
  }
})

test('build disables the server so it cannot initialize the API database', async () => {
  const config = await loadConfig('build')
  assert.equal(config.server, false)
  assert.equal(config._build, true)
  assert.equal(config._start, false)
})

test('invalid invocation and invalid port fail explicitly', async () => {
  await assert.rejects(loadConfig('dev'), /Use build or start/)
  const oldPort = process.env.PORT
  process.env.PORT = 'invalid'
  try { await assert.rejects(loadConfig('start'), /Invalid PORT/) } finally {
    if (oldPort === undefined) delete process.env.PORT; else process.env.PORT = oldPort
  }
})

test('metadata compatibility applies only to the two observed old packages', () => {
  const resolver = { requireModule: name => require(name) }
  allowLegacyBuildMetadata({ resolver })
  assert.equal(resolver.requireModule('@nuxt/ufo/package.json').version, '0.5.2')
  assert.equal(resolver.requireModule('vuex/package.json').version, '3.6.0')
  assert.equal(resolver.requireModule('path'), path)
  assert.throws(() => resolver.requireModule('@nuxt/ufo/not-public.json'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' })
})

test('webpack 4.47 hashing works while OpenSSL legacy MD4 remains disabled', () => {
  assert.equal(require('webpack/package.json').version, '4.47.0')
  assert.throws(() => crypto.createHash('md4'), { code: 'ERR_OSSL_EVP_UNSUPPORTED' })
  const hash = require('webpack/lib/util/createHash')('md4').update('').digest('hex')
  assert.equal(hash, '31d6cfe0d16ae931b73c59d7e0c089c0')
})

test('fresh build manifest points to existing player, login, admin, and SPA assets', () => {
  const root = path.resolve(__dirname, '../..')
  const client = path.join(root, '.nuxt/dist/client')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.nuxt/dist/server/client.manifest.json'), 'utf8'))
  assert.equal(manifest.publicPath, '/_nuxt/')
  assert.ok(manifest.all.length > 20)
  for (const entry of manifest.all) assert.ok(fs.existsSync(path.resolve(client, entry)), entry)
  for (const prefix of ['pages/_id.', 'pages/login.', 'pages/admin/index.', 'pages/admin/_id.']) {
    assert.ok(manifest.all.some(entry => entry.startsWith(prefix)), prefix)
  }
})
