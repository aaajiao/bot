'user strict'

import express from 'express'
import favicon from 'serve-favicon'
import bodyParser from 'body-parser'
import fileUpload from 'express-fileupload'
import mongoose from 'mongoose'
import config from './config'
import routes from './routes'

mongoose.Promise = global.Promise
const mongoDB = `mongodb://${config.database.host}/${config.database.dbname}`

export default (app) => {
  mongoose.connect(mongoDB, {
    userMongoClient: true
  })
  const db = mongoose.connection
  db.on('error', console.error.bind(console, 'MongoDB connection error:'))
  app.use(express.static(config.static_dir.root))
  app.use(favicon(config.static_dir.root + '/favicon.ico'))
  app.use(bodyParser.json())
  app.use(fileUpload())
  app.use('/api', routes())

  app.use((req, res, next) => {
    if (res.body !== undefined) {
      res.body = {
        status: 200,
        data: res.body
      }
      res.json(res.body)
    } else {
      next()
    }
  })

  app.use((err, req, res, next) => {
    res.body = {
      status: err.status,
      message: err.message
    }
    res.status(err.status || 500)
    res.json(res.body)
  })
}
