'use strict'

// Real Mongoose schemas, casting, middleware and controllers with synthetic
// collection methods. No MongoDB connection, upload files or authentication state.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const mongoose = require('mongoose')
const Project = require('../api/mongo/models/project')
const Item = require('../api/mongo/models/item')
const projects = require('../api/mongo/controllers/projectController')
const items = require('../api/mongo/controllers/itemController')

const projectId = new mongoose.Types.ObjectId('0123456789abcdef01234567')
const itemId = new mongoose.Types.ObjectId('1123456789abcdef01234567')
const project = {
  _id: projectId, title: 'Isolated fixture', color: '#123456', width: 1920,
  height: 1080, endTime: 1000, link: '',
  date_of_create: new Date('2020-01-01T12:00:00Z'),
  date_of_update: new Date('2020-01-02T12:00:00Z')
}
const item = {
  _id: itemId, project: projectId, TUID: 'fixture-item', type: 'image',
  file: { name: 'synthetic-fixture.png', mimetype: 'image/png' },
  startTime: 0, endTime: 100, x: 0, y: 10, width: 640, height: 480, zIndex: 50
}

async function mockedCollection(model, methods, action) {
  const original = {}
  for (const [name, method] of Object.entries(methods)) {
    original[name] = model.collection[name]
    model.collection[name] = method
  }
  try { return await action() } finally {
    for (const [name, method] of Object.entries(original)) model.collection[name] = method
  }
}

async function call(controller, request) {
  let response
  let error
  await controller(request, {
    send(value) { response = value },
    json(value) { response = value }
  }, value => { error = value })
  if (error) throw error
  assert.notEqual(response, undefined)
  return JSON.parse(JSON.stringify(response))
}

test('maintained ODM, driver and lean plugin are pinned to the reviewed versions', () => {
  assert.equal(mongoose.version, '9.11.3')
  assert.equal(require('mongodb/package.json').version, '7.7.0')
  assert.equal(require('mongoose-lean-virtuals/package.json').version, '2.1.0')
  assert.equal(mongoose.connection.readyState, 0)
})

test('existing project and item document JSON preserves player/admin virtuals', async () => {
  const p = new Project(project)
  const i = new Item(item)
  await p.validate()
  await i.validate()
  const result = p.toJSON()
  assert.equal(result.url, '/' + projectId)
  assert.equal(result.adminUrl, '/admin/' + projectId)
  assert.equal(result.url_delete, '/api/project/delete/' + projectId)
  assert.equal(typeof result.creatFormatted, 'string')
  assert.equal(i.toJSON().source, '/uploads/synthetic-fixture.png')
  const frame = new Item(Object.assign({}, item, { file: undefined, type: 'iframe', link: 'https://example.invalid/' }))
  assert.equal(frame.toJSON().source, null)
})

test('project list lean virtuals and item counts survive the plugin upgrade', async () => {
  await mockedCollection(Project, { find: () => ({ toArray: async () => [Object.assign({}, project)] }) }, async () => {
    await mockedCollection(Item, { countDocuments: async filter => {
      assert.equal(filter.project.toHexString(), projectId.toHexString())
      return 3
    } }, async () => {
      const result = await call(projects.projectList, {})
      assert.equal(result.length, 1)
      assert.equal(result[0].itemsCount, 3)
      assert.equal(result[0].adminUrl, '/admin/' + projectId)
      assert.equal(result[0].url_update, '/api/project/update/' + projectId)
    })
  })
})

test('public project detail keeps the existing response fields and z-index sort', async () => {
  await mockedCollection(Project, { findOne: async () => Object.assign({}, project) }, async () => {
    await mockedCollection(Item, { find: (filter, options) => {
      assert.equal(filter.project.toHexString(), projectId.toHexString())
      assert.deepEqual(options.sort, { zIndex: -1 })
      return { toArray: async () => [Object.assign({}, item)] }
    } }, async () => {
      const result = await call(projects.projectDetail, { params: { id: projectId.toHexString().toUpperCase() } })
      assert.deepEqual(Object.keys(result).sort(), ['items', 'color', 'width', 'height', 'endTime', 'link'].sort())
      assert.equal(result.items[0].source, '/uploads/synthetic-fixture.png')
      assert.equal(result.items[0].project, projectId.toHexString())
    })
  })
})

test('item creation uses a real ObjectId and retains multipart metadata and numeric casting', async () => {
  let inserted
  await mockedCollection(Item, { insertOne: async doc => {
    inserted = doc
    return { acknowledged: true, insertedId: doc._id }
  } }, async () => {
    const body = Object.assign({}, item, { project_id: projectId.toHexString(), width: '640', height: '480' })
    const result = await call(items.itemCreatePost, {
      body, files: { file: { filename: 'synthetic-fixture.png', mimetype: 'image/png' } }
    })
    assert.equal(result.success, true)
    assert.ok(inserted.project instanceof mongoose.Types.ObjectId)
    assert.equal(inserted.project.toHexString(), projectId.toHexString())
    assert.equal(result.data.width, 640)
    assert.equal(result.data.source, '/uploads/synthetic-fixture.png')
  })
})

test('item update retains its response contract and casts the project reference', async () => {
  let written
  await mockedCollection(Item, {
    findOne: async () => Object.assign({}, item),
    updateOne: async (filter, update) => { written = update; return { acknowledged: true, matchedCount: 1, modifiedCount: 1 } }
  }, async () => {
    const result = await call(items.itemUpdatePost, {
      params: { id: itemId.toHexString() },
      body: Object.assign({}, item, { project_id: projectId.toHexString(), fileChanged: 'false', x: '42' })
    })
    assert.equal(result.success, true)
    assert.equal(written.$set.project.toHexString(), projectId.toHexString())
    assert.equal(written.$set.x, 42)
    assert.equal(written.$set.file, undefined)
  })
})

test('project create and update retain IDs, timestamps and success responses', async () => {
  let update
  await mockedCollection(Project, {
    insertOne: async doc => ({ acknowledged: true, insertedId: doc._id }),
    findOneAndUpdate: async (filter, written) => { update = written; return Object.assign({}, project) }
  }, async () => {
    const created = await call(projects.projectCreatePost, { body: project })
    assert.match(created._id, /^[0-9a-f]{24}$/)
    assert.equal(created.date_of_create, project.date_of_create.toISOString())
    const changed = await call(projects.projectUpdatePost, { params: { id: projectId.toHexString() }, body: project })
    assert.equal(changed.success, true)
    assert.equal(update.$set.title, project.title)
  })
})

test('upgrade does not introduce cascade deletion or media cleanup', async () => {
  let deletedItems = 0
  let deletedProjects = 0
  await mockedCollection(Item, {
    deleteOne: async filter => { assert.ok(filter.project); deletedItems++; return { acknowledged: true, deletedCount: 1 } },
    deleteMany: async () => { throw new Error('Unexpected new cascade') }
  }, async () => {
    await mockedCollection(Project, {
      deleteOne: async () => { deletedProjects++; return { acknowledged: true, deletedCount: 1 } }
    }, async () => {
      const result = await call(projects.projectDeletePost, { params: { id: projectId.toHexString() } })
      assert.equal(result.success, true)
    })
  })
  // This is the pre-existing one-child deletion behavior, not a new cleanup policy.
  assert.equal(deletedItems, 1)
  assert.equal(deletedProjects, 1)
})

test('invalid project references fail before collection writes', async () => {
  let writes = 0
  await mockedCollection(Item, { insertOne: async () => { writes++; throw new Error('Unexpected write') } }, async () => {
    await assert.rejects(call(items.itemCreatePost, { body: Object.assign({}, item, { project_id: 'not-an-object-id' }) }))
  })
  assert.equal(writes, 0)
})

test('initial connection failure uses a bounded pool and exits without leaking error details', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../api/index.js'), 'utf8')
  const logs = []
  const exits = []
  const handlers = {}
  let options
  const noop = () => {}
  const app = { use: noop, post: noop, get: noop }
  const express = Object.assign(() => app, { urlencoded: () => noop })
  const stubs = {
    express, 'body-parser': { json: () => noop }, 'cookie-parser': () => noop,
    mongoose: {
      connect(uri, value) { options = value; return Promise.reject(new Error('SENSITIVE_FIXTURE_CONNECTION_DETAIL')) },
      connection: { on(event, fn) { handlers[event] = fn } }
    },
    './mongo/controllers/projectController': {}, './mongo/controllers/itemController': {},
    './token-revocations': { createStore: () => ({}) }, dotenv: { config: noop },
    'express-form-post': () => ({ middleware: () => noop }),
    'express-jwt': () => ({ unless: () => noop }), jsonwebtoken: {},
    path, crypto: require('node:crypto')
  }
  const context = { module: { exports: {} }, __dirname: '/isolated-fixture/api',
    require(name) { assert.ok(Object.hasOwn(stubs, name), name); return stubs[name] },
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    process: { env: { MONGO_URL: 'mongodb://fixture.invalid/test', JWT_SECRET: 'synthetic' }, exit: code => exits.push(code) } }
  vm.runInNewContext(source, context, { filename: 'isolated-bot-api.js' })
  await new Promise(resolve => setImmediate(resolve))
  handlers.error(new Error('SENSITIVE_FIXTURE_CONNECTION_DETAIL'))
  assert.equal(options.maxPoolSize, 5)
  assert.deepEqual(Object.keys(options), ['maxPoolSize'])
  assert.deepEqual(exits, [1])
  assert.ok(logs.length)
  assert.ok(logs.every(line => !line.includes('SENSITIVE_FIXTURE') && !line.includes('mongodb://')))
  assert.equal(mongoose.connection.readyState, 0)
})
