<template>
  <section class="hero is-fullheight">
    <div class="hero-body">
      <div class="container has-text-centered">
        <div class="column is-4 is-offset-4">
          <h3 class="title has-text-grey">Login</h3>
          <p class="subtitle has-text-grey">Please login to proceed.</p>
          <div v-if="error" show variant="danger">{{ error + '' }}</div>
          <div show v-if="$auth.$state.redirect">
            You have to login before accessing to <strong>{{ $auth.$state.redirect }}</strong>
          </div>
          <busy-overlay/>
          <div class="box">
            <form @keydown.enter="login">
              <div class="field">
                <div class="control">
                  <input v-model="username" ref="username" class="input is-large"
                         placeholder="Your Username" autofocus="">
                </div>
              </div>

              <div class="field">
                <div class="control">
                  <input class="input is-large" v-model="password" type="password"
                         placeholder="Your Password">
                </div>
              </div>
              <div class="field">
                <label class="checkbox">
                  <input type="checkbox">
                  Remember me
                </label>
              </div>
              <button class="button is-block is-info is-large is-fullwidth" @click="login">Login
              </button>
            </form>
          </div>
          <!--<p class="has-text-grey">-->
          <!--<a href="../">Sign Up</a> &nbsp;·&nbsp;-->
          <!--<a href="../">Forgot Password</a> &nbsp;·&nbsp;-->
          <!--<a href="../">Need Help?</a>-->
          <!--</p>-->
        </div>
      </div>
    </div>
  </section>
  <!--<div>-->
  <!--<h2 class="text-center">Login</h2>-->
  <!--<hr>-->
  <!--<b-alert v-if="error" show variant="danger">{{ error + '' }}</b-alert>-->
  <!--<b-alert show v-if="$auth.$state.redirect">-->
  <!--You have to login before accessing to <strong>{{ $auth.$state.redirect }}</strong>-->
  <!--</b-alert>-->
  <!--<b-row align-h="center" align-v="center">-->
  <!--<b-col md="4">-->
  <!--<b-card bg-variant="light">-->
  <!--<busy-overlay/>-->
  <!--<form @keydown.enter="login">-->
  <!--<b-form-group label="Username">-->
  <!--<b-input v-model="username" placeholder="anything" ref="username"/>-->
  <!--</b-form-group>-->

  <!--<b-form-group label="Password">-->
  <!--<b-input type="password" v-model="password" placeholder="123"/>-->
  <!--</b-form-group>-->

  <!--<div class="text-center">-->
  <!--<b-btn @click="login" variant="primary" block>Login</b-btn>-->
  <!--</div>-->
  <!--</form>-->
  <!--</b-card>-->
  <!--</b-col>-->
  <!--<b-col md="1">-->
  <!--<div class="text-center">-->
  <!--<b-badge pill>OR</b-badge>-->
  <!--</div>-->
  <!--</b-col>-->
  <!--<b-col md="4" class="text-center pt-4">-->
  <!--<b-card title="Social Login" bg-variant="light">-->
  <!--<div v-for="s in strategies" :key="s.key" class="mb-2">-->
  <!--<b-btn @click="$auth.loginWith(s.key)" block :style="{background: s.color}"-->
  <!--class="login-button">Login with {{ s.name }}-->
  <!--</b-btn>-->
  <!--</div>-->
  <!--</b-card>-->
  <!--</b-col>-->
  <!--</b-row>-->
  <!--</div>-->
</template>

<style scoped>
  .login-button {
    border: 0
  }
</style>

<script>
  import busyOverlay from '~/components/busy-overlay'

  export default {
    components: { busyOverlay },
    data: function () {
      return {
        username: '',
        password: '',
        error: null
      }
    },
    computed: {
      redirect () {
        return (
          this.$route.query.redirect &&
          decodeURIComponent(this.$route.query.redirect)
        )
      },
      isCallback () {
        return Boolean(this.$route.query.callback)
      }
    },
    methods: {
      async login () {
        this.error = null

        return this.$auth
          .loginWith('local', {
            data: {
              username: this.username,
              password: this.password
            }
          })
          .catch(e => {
            this.error = e + ''
          })
      }
    }
  }
</script>
