'use strict'

// Preload only in an explicitly isolated, network-none retained-image fixture.
// This checks the real Nuxt listener and retained UI, with Mongo stubbed. Real
// Mongo CRUD is independently covered by mongodb-integration.js.
const assert = require('node:assert/strict')
const http = require('node:http')
const os = require('node:os')
assert.equal(process.env.BOT_TEST_ISOLATED, '1')
assert.ok(Object.values(os.networkInterfaces()).flat().every(address => address.internal), 'Fixture requires network-none isolation')
process.env.HOST = '127.0.0.1'
process.env.PORT = '38889'
process.env.JWT_SECRET = 'synthetic-fixture-key-not-a-production-secret'
process.env.LOGIN_USER = 'isolated-fixture-user'
process.env.LOGIN_PASS = 'synthetic-fixture-password'
process.env.MONGO_URL = 'mongodb://127.0.0.1:1/fixture_disabled'
const mongoose = require('/app/node_modules/mongoose')
mongoose.connect = async () => mongoose

function request(path, method = 'GET', data, token) {
  return new Promise((resolve, reject) => {
    const body = data === undefined ? '' : JSON.stringify(data)
    const headers = { 'Content-Length': Buffer.byteLength(body) }
    if (data !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = 'Bearer ' + token
    const req = http.request({ hostname: '127.0.0.1', port: 38889, path, method, headers, agent: false }, res => {
      let text = ''
      res.on('data', chunk => { text += chunk })
      res.on('end', () => resolve({ status: res.statusCode, text }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('Fixture HTTP timeout')))
    req.end(body)
  })
}

async function main() {
  await require('/app/ops/runtime/nuxt-node24.cjs').run('start')
  const homepage = await request('/')
  const match = homepage.text.match(/(?:src|href)="([^" ]*\/_nuxt\/[^" ]+\.js)"/)
  assert.ok(match, 'Retained JS asset must be in homepage')
  const asset = await request(match[1])
  const loginPage = await request('/login')
  const anonymous = await request('/api/auth/user')
  const login = await request('/api/auth/login', 'POST', { username: process.env.LOGIN_USER, password: process.env.LOGIN_PASS })
  assert.equal(login.status, 200)
  const token = JSON.parse(login.text).token
  const user = await request('/api/auth/user', 'GET', undefined, token)
  const logout = await request('/api/auth/logout', 'POST', {}, token)
  const replay = await request('/api/auth/user', 'GET', undefined, token)
  assert.ok([homepage, asset, loginPage, user, logout].every(response => response.status === 200))
  assert.equal(anonymous.status, 401)
  assert.equal(replay.status, 401)
  assert.ok(Buffer.byteLength(asset.text) > 100)
  console.log('RETAINED_RUNTIME_SMOKE ' + JSON.stringify({ passed: true, node: process.version, mongoose: mongoose.version, checks: 8, homepage: homepage.status, asset: asset.status, loginPage: loginPage.status, anonymous: anonymous.status, login: login.status, user: user.status, logout: logout.status, replay: replay.status, realDatabase: false, productionAccess: false }))
  process.exit(0)
}
const deadline = setTimeout(() => { console.error('Fixture deadline exceeded'); process.exit(1) }, 60000)
deadline.unref()
main().catch(error => { console.error(JSON.stringify({ passed: false, error: error.name, message: error.message })); process.exit(1) })
