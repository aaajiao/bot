'use strict'

const dbname = process.env.NODE_ENV === 'test' ? 'crazy-player' : 'crazy'

export default {
  app: {
    name: 'Crazy Player',
    version: '1.0.0'
  },
  database: {
    driver: 'mongoose',
    host: 'localhost',
    port: 27017,
    dbname: dbname,
    username: 'admin',
    password: '123456',
    options: {
    }
  },
  server: {
    port: 3001
  },
  static_dir: {
    root: './static',
    options: {}
  },
  session: {
    secretKey: 'something'
  }
}
