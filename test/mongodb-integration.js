'use strict'

// Run only against an operator-created isolated Mongo container. Each invocation
// creates and drops its own random bot_driver_fixture_* database, never app data.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const mongoose = require('mongoose')
const connect = require('connect')
const jwt = require('jsonwebtoken')
const revocations = require('../api/token-revocations')

assert.equal(process.env.BOT_TEST_ISOLATED, '1', 'Explicit isolated-fixture opt-in required')
const base = new URL(process.env.BOT_TEST_MONGO_BASE || 'mongodb://127.0.0.1:27017')
assert.equal(base.protocol, 'mongodb:')
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use loopback in the fixture network namespace')
assert.ok(!base.username && !base.password && !base.search && (!base.pathname || base.pathname === '/'), 'No credentials or pre-existing database allowed')
const expectedVersion = process.env.BOT_TEST_EXPECTED_VERSION
assert.match(expectedVersion || '', /^(4\.4\.30|8\.0\.34)$/)
const database = 'bot_driver_fixture_' + crypto.randomBytes(12).toString('hex')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-driver-'))
const uploads = path.join(temporary, 'uploads')
fs.mkdirSync(uploads, { mode: 0o700 })
const stores = []
const checks = []
const source = fs.readFileSync(path.join(__dirname, '../api/index.js'), 'utf8')
const secret = crypto.randomBytes(48).toString('hex')
const password = crypto.randomBytes(24).toString('hex')
process.env.MONGO_URL = 'mongodb://' + base.host + '/' + database
process.env.JWT_SECRET = secret
process.env.LOGIN_USER = 'isolated-fixture-user'
process.env.LOGIN_PASS = password

function appFromSource() {
  const entry = { exports: {} }
  const stubs = {
    dotenv: { config() {} },
    './mongo/controllers/projectController': require('../api/mongo/controllers/projectController'),
    './mongo/controllers/itemController': require('../api/mongo/controllers/itemController'),
    './token-revocations': Object.assign({}, revocations, {
      createStore(options) {
        const store = revocations.createStore(Object.assign({}, options, {
          directory: path.join(temporary, 'revocations'), requireMount: false, cleanupIntervalMs: 0
        }))
        stores.push(store)
        return store
      }
    }),
    'express-form-post': options => require('express-form-post')(Object.assign({}, options, { directory: uploads }))
  }
  const fn = vm.runInThisContext('(function(require,module,exports,__dirname){\n' + source + '\n})', { filename: 'isolated-bot-api.js' })
  fn(name => Object.hasOwn(stubs, name) ? stubs[name] : require(name), entry, entry.exports, path.join(__dirname, '../api'))
  const app = connect()
  app.use(entry.exports.path, entry.exports.handler)
  app.use((error, req, res, next) => {
    res.statusCode = error.status || 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error.name }))
  })
  return http.createServer(app)
}
function listen(server) { return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port))) }
function close(server) { return new Promise(resolve => server.close(resolve)) }
function request(port, route, data, token, multipart, method = 'POST') {
  return new Promise((resolve, reject) => {
    let body
    const headers = {}
    if (multipart) {
      const boundary = 'fixture-' + crypto.randomBytes(12).toString('hex')
      body = Object.entries(data).map(([key, value]) => '--' + boundary + '\r\nContent-Disposition: form-data; name="' + key + '"\r\n\r\n' + value + '\r\n').join('')
      if (multipart === 'file') body += '--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="synthetic-fixture.txt"\r\nContent-Type: text/plain\r\n\r\nIsolated fixture content\r\n'
      body += '--' + boundary + '--\r\n'
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
    } else {
      body = data === undefined ? '' : JSON.stringify(data)
      if (data !== undefined) headers['Content-Type'] = 'application/json'
    }
    if (token) headers.Authorization = 'Bearer ' + token
    headers['Content-Length'] = Buffer.byteLength(body)
    const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers, agent: false }, res => {
      let raw = ''
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        let value
        try { value = JSON.parse(raw) } catch (_) { value = raw }
        resolve({ status: res.statusCode, data: value })
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => req.destroy(new Error('Fixture HTTP timeout')))
    req.end(body)
  })
}
function pass(name) { checks.push({ name, passed: true }) }

async function main() {
  let server
  let result
  try {
    server = appFromSource()
    await mongoose.connection.asPromise()
    assert.equal(mongoose.connection.name, database)
    const info = await mongoose.connection.db.admin().command({ buildInfo: 1 })
    assert.equal(info.version, expectedVersion)
    // Model autoCreate may already have made empty collections after connect.
    // Every collection in this newly randomized database must contain no data.
    for (const collection of await mongoose.connection.db.listCollections().toArray()) {
      assert.equal(await mongoose.connection.db.collection(collection.name).countDocuments({}), 0, 'Fixture database must start empty')
    }
    pass('explicit isolated server and fresh random database')
    const port = await listen(server)
    const Project = require('../api/mongo/models/project')
    const Item = require('../api/mongo/models/item')
    const denied = await request(port, '/api/project/create', { title: 'must-not-save' })
    assert.equal(denied.status, 401)
    assert.equal(await Project.countDocuments({}), 0)
    pass('anonymous write denied before Mongo insertion')
    const badLogin = await request(port, '/api/auth/login', { username: process.env.LOGIN_USER, password: 'wrong' })
    assert.equal(badLogin.status, 401)
    const login = await request(port, '/api/auth/login', { username: process.env.LOGIN_USER, password })
    assert.equal(login.status, 200)
    const token = login.data.token
    const claims = jwt.verify(token, secret)
    assert.equal(claims.exp - claims.iat, 24 * 60 * 60)
    pass('real login and bounded JWT')
    const created = await request(port, '/api/project/create', { title: 'Isolated project', color: '#010203', width: 1920, height: 1080, endTime: 1000 }, token)
    assert.equal(created.status, 200)
    const id = created.data._id
    assert.match(id, /^[0-9a-f]{24}$/)
    assert.equal(created.data.adminUrl, '/admin/' + id)
    pass('authenticated project save and JSON virtuals')
    const input = { TUID: 'synthetic-item', project_id: id, type: 'image', startTime: 0, endTime: 100, x: 1, y: 2, width: 640, height: 480, zIndex: 50 }
    const first = await request(port, '/api/item/create', input, token, 'file')
    assert.equal(first.status, 200)
    assert.equal(first.data.success, true)
    assert.equal(first.data.data.project, id)
    assert.equal(fs.readFileSync(path.join(uploads, first.data.data.file.name), 'utf8'), 'Isolated fixture content')
    pass('authenticated multipart file metadata and real item insert')
    const second = await request(port, '/api/item/create', Object.assign({}, input, { TUID: 'second', type: 'iframe', link: 'https://example.invalid/', zIndex: 60 }), token, 'fields')
    assert.equal(second.status, 200)
    const detail = await request(port, '/api/project/' + id.toUpperCase())
    assert.equal(detail.status, 200)
    assert.deepEqual(Object.keys(detail.data).sort(), ['items', 'color', 'width', 'height', 'endTime', 'link'].sort())
    assert.equal(detail.data.items.length, 2)
    assert.equal(detail.data.items[0].zIndex, 60)
    assert.equal(detail.data.items[1].source, '/uploads/' + first.data.data.file.name)
    pass('public player response and ordered original item fields')
    const list = await request(port, '/api/project/', {}, token)
    assert.equal(list.status, 200)
    assert.equal(list.data[0].itemsCount, 2)
    assert.equal(list.data[0].url, '/' + id)
    pass('admin list uses lean virtuals and accurate counts')
    const updated = await request(port, '/api/item/update/' + first.data.data._id, Object.assign({}, input, { x: 88, fileChanged: 'false' }), token, 'fields')
    assert.equal(updated.status, 200)
    assert.equal((await Item.findById(first.data.data._id)).x, 88)
    assert.equal((await Item.findById(first.data.data._id)).file.name, first.data.data.file.name)
    const projectUpdate = await request(port, '/api/project/update/' + id, { title: 'Updated fixture', color: '#040506', width: 1000, height: 800, endTime: 500 }, token)
    assert.equal(projectUpdate.status, 200)
    assert.equal((await Project.findById(id)).title, 'Updated fixture')
    pass('real project/item updates retain file and ObjectId data')
    const invalid = await request(port, '/api/item/create', Object.assign({}, input, { project_id: 'invalid' }), token, 'fields')
    assert.equal(invalid.status, 500)
    assert.equal(await Item.countDocuments({}), 2)
    pass('invalid reference never inserts')
    const deletedItem = await request(port, '/api/item/delete/' + second.data.data._id, {}, token)
    assert.equal(deletedItem.status, 200)
    assert.equal(await Item.countDocuments({}), 1)
    const deletedProject = await request(port, '/api/project/delete/' + id, {}, token)
    assert.equal(deletedProject.status, 200)
    assert.equal(await Project.countDocuments({}), 0)
    assert.equal(await Item.countDocuments({}), 0)
    assert.ok(fs.existsSync(path.join(uploads, first.data.data.file.name)), 'Do not introduce deletion of existing upload files')
    pass('existing delete behavior with no new media deletion')
    const logout = await request(port, '/api/auth/logout', {}, token)
    assert.equal(logout.status, 200)
    assert.equal((await request(port, '/api/auth/user', undefined, token, false, 'GET')).status, 401)
    await close(server)
    server = appFromSource()
    const restartPort = await listen(server)
    assert.equal((await request(restartPort, '/api/auth/user', undefined, token, false, 'GET')).status, 401)
    pass('logout revocation survives API reload with real persistent flock state')
    result = { passed: true, serverVersion: info.version, mongoose: mongoose.version, driver: require('mongodb/package.json').version, checks, syntheticOnly: true, productionAccess: false }
  } finally {
    if (server && server.listening) await close(server)
    for (const store of stores) store.close()
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, database)
      assert.match(database, /^bot_driver_fixture_[0-9a-f]{24}$/)
      await mongoose.connection.dropDatabase()
      assert.equal((await mongoose.connection.db.listCollections().toArray()).length, 0)
    }
    await mongoose.disconnect()
    fs.rmSync(temporary, { recursive: true, force: true })
  }
  result.cleanupVerified = true
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(JSON.stringify({ passed: false, error: error.name, message: error.message, syntheticOnly: true }))
  process.exitCode = 1
})
