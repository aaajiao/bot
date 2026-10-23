const express      = require('express')
const bodyParser   = require('body-parser')
const mongoose     = require('mongoose')
const cookieParser = require('cookie-parser')
const pCon         = require('./mongo/controllers/projectController')
const iCon         = require('./mongo/controllers/itemController')
const path         = require('path')
const efp          = require('express-form-post')
const jwt          = require('express-jwt')
const jwtB         = require('jsonwebtoken')
const crypto       = require('crypto')
const revocations  = require('./token-revocations')

require('dotenv').config()
const tokenRevocations = revocations.createStore({
  directory: '/app/maintenance-state',
  requireMount: true,
  onMaintenanceError: () => console.error('[auth] Authentication state maintenance unavailable')
})
// console.log(path.resolve(__dirname, '../static/uploads'))

const formPost = efp({
                       store: 'disk',
                       promise: true,
                       directory: path.resolve(__dirname, '../static/uploads'),
                       filename: function (req, file, cb) {
                         cb(Date.now() + '_' + file.originalname)
                       }
                     })

const mongoUrl = process.env.MONGO_URL
mongoose.connect(mongoUrl, {
  // Preserve the old driver's five-connection pool on this small host.
  maxPoolSize: 5
}).catch(() => {
  // Keep startup failure visible to the container restart policy without
  // logging a connection string or relying on an unhandled rejection.
  console.error('MongoDB initial connection failed')
  process.exit(1)
})
const db = mongoose.connection
db.on('error', () => console.error('MongoDB connection error'))
db.on('connected', () => {
  console.log('Mongoose connected')
})
db.on('disconnected', () => {
  console.log('Mongoose disconnected')
})

const app = express()
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(bodyParser.json())
// JWT middleware
app.use(
  jwt({
        secret: process.env.JWT_SECRET,
        isRevoked: (req, payload, done) => {
          // Older unbounded tokens must be replaced by a fresh login.
          if (!Number.isSafeInteger(payload.exp) || payload.exp <= 0) return done(null, true)
          try {
            req.authTokenDigest = revocations.tokenDigest(req)
            done(null, tokenRevocations.isRevoked(req.authTokenDigest))
          } catch (err) {
            done(err)
          }
        }
      }).unless({
                  // Nuxt mounts this Express app at /api; match its local path.
                  useOriginalUrl: false,
                  path: [
                    {
                      url: /^\/auth\/login\/?$/,
                      methods: ['POST']
                    },
                    {
                      url: /^\/project\/[0-9a-fA-F]{24}\/?$/,
                      methods: ['POST']
                    }
                  ]
                })
)

// -- Routes --
app.post('/project/', pCon.projectList)
app.post('/project/create', pCon.projectCreatePost)
app.post('/project/:id', pCon.projectDetail)
app.post('/project/delete/:id', pCon.projectDeletePost)
app.post('/project/update/:id', pCon.projectUpdatePost)

app.post('/item/create', formPost.middleware(), iCon.itemCreatePost)
app.post('/item/update/:id', formPost.middleware(), iCon.itemUpdatePost)
app.post('/item/delete/:id', iCon.itemDeletePost)
app.post('/auth/login', (req, res, next) => {
  const { username, password } = req.body
//  console.log(username, password)
//  console.log(process.env.LOGIN_USER ,process.env.LOGIN_PASS)
  const valid                  = username === process.env.LOGIN_USER && password === process.env.LOGIN_PASS
  if (valid) {
    try {
      tokenRevocations.assertReadable()
    } catch (err) {
      return next(err)
    }
    const token = jwtB.sign(
      {
        username,
        name: 'User ' + username,
        scope: ['bot', 'user']
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h', jwtid: crypto.randomBytes(32).toString('hex') }
    )
    res.json({ token })
  } else {
    res.sendStatus(401)
  }
})

// [GET] /user
app.get('/auth/user', (req, res, next) => {
  res.json({ user: req.user })
})

// [POST] /logout
app.post('/auth/logout', (req, res, next) => {
  try {
    tokenRevocations.revoke(req.authTokenDigest, req.user.exp)
    res.json({ status: 'OK' })
  } catch (err) {
    next(err)
  }
})

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'AUTH_STATE_UNAVAILABLE') {
    return res.status(503).json({
      status: 503,
      name: 'AuthStateUnavailable',
      message: 'Authentication is temporarily unavailable. Please try again later.'
    })
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 401,
      name: err.name,
      message: err.message
    })
  }
  next(err)
})

app.use((req, res, next) => {
  res.sendStatus(404)
})

//app.use((err, req, res, next) => {
//  if (err) console.log(err)
//  res.body = {
//    status: err.status,
//    message: err.message
//  }
//  res.status(err.status || 500)
//  res.json(res.body)
//})

// app.use((err, req, res, next) => {
//   console.error(err) // eslint-disable-line no-console
//   res.status(401).send(err + '')
// })

// -- export app --
module.exports = {
  path: '/api',
  handler: app
}
