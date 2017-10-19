module.exports = {
  /*
  ** Headers of the page
  */
  head: {
    title: 'crazyplayer',
    meta: [
      {charset: 'utf-8'},
      {name: 'viewport', content: 'width=device-width, initial-scale=1'},
      {hid: 'description', name: 'description', content: 'A Player for Dom Elements'}
    ],
    link: [
      {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'}
    ]
  },
  /*
  ** Customize the progress bar color
  */
  loading: {color: '#3B8070'},
  /*
  ** Build configuration
  */
  build: {
    /*
    ** Run ESLint on save
    */
    extend (config, ctx) {
      if (ctx.dev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    },
    vendor: [
      'lodash',
      'form-data',
      'axios',
      'moment',
      'vue-upload-component'
      // 'vue-factory'
    ],
    postcss: {
      plugins: {
        'postcss-custom-properties': false
      }
    }
  },
  plugins: [
    // '~/plugins/vue-factory'
    '~/plugins/vue-paginate'
  ],
  css: [
    'bulma',
    'font-awesome/css/font-awesome.css'
  ],
  env: {
    HOST_URL: process.env.HOST_URL || 'http://127.0.0.1:3000'
  }
}
