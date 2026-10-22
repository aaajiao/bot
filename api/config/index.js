'use strict'

const dbname = 'crazy-player'

module.exports = {
  app: {
    name: 'Crazy Player',
    version: '1.0.0'
  },
  static_dir: {
    root: './static',
    options: {}
  },
  session: {
    secretKey: 'something'
  }
}
