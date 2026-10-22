const { resolve } = require('path')

module.exports = {
//  components: true,
//  rootDir: __dirname,
//  srcDir: __dirname,
//  buildDir: './dist',
  ssr: false,
  axios: {
    proxy: true
  },
  proxy: {
    '/api': '0.0.0.0:3000'
  },
  build: {
    extractCSS: true,
    postcss: {
      plugins: {
        'postcss-custom-properties': false
      }
    }
  },
  head: {
    title: 'bot,',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'bot,' }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '~/assets/favicon.ico' }]
  },
  serverMiddleware: [
    { path: '/api', handler: '~/api/index.js' }
  ],
  router: {
    middleware: ['auth']
  },
  buildModules: [
    ['@nuxtjs/fontawesome', {
      component: 'Fa',
      suffix: true
    }]
  ],
  modules: [
    // 'bootstrap-vue/nuxt',
    '@nuxtjs/bulma',
//    '@nuxtjs/font-awesome',
    '@nuxtjs/axios',
    '@nuxtjs/auth'
  ],
  plugins: [
    '~/plugins/vue-paginate',
    '~/plugins/vue-dnd',
    { src: '~/plugins/vue-sweetalert2', ssr: false }
  ],
  auth: {
    redirect: {
      callback: '/callback'
    },
    strategies: {
      local: {
        endpoints: {
          login: { propertyName: 'token' }
        }
      }
    }
  }
}
