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

require('dotenv').config()
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
  useNewUrlParser: true,
  useUnifiedTopology: true
})
const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))
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
        secret: process.env.JWT_SECRET
      }).unless({
                  path: [
                    /auth\/login/,
                    {
                      url: /\/project\/[a-zA-Z0-9]+/,
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
    const token = jwtB.sign(
      {
        username,
        name: 'User ' + username,
        scope: ['bot', 'user']
      },
      process.env.JWT_SECRET
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
  res.json({ status: 'OK' })
})

// Error handler
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
