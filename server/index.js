'use strict'

import express from 'express'
import { Builder, Nuxt } from 'nuxt'
import middlewares from './middlewares'

const app = express()
const host = process.env.HOST || '127.0.0.1'
const port = process.env.PORT || 3001

app.set('port', port)

middlewares(app)

let configNuxt = require('../nuxt.config.js')
configNuxt.dev = !(process.env.NODE_ENV === 'production')

const nuxt = new Nuxt(configNuxt)

if (configNuxt.dev) {
  const builder = new Builder(nuxt)
  builder.build()
}

app.use(nuxt.render)
app.listen(port, host)
console.log(`Server listening on ${host}:${port}`)
