<template>
  <div>
    <!--<b-navbar toggleable="md" variant="light">-->
      <!--<b-navbar-toggle target="nav_collapse"></b-navbar-toggle>-->
      <!--<b-navbar-brand to="/">Nuxt.js</b-navbar-brand>-->

      <!--<b-collapse is-nav id="nav_collapse">-->
        <!--<b-navbar-nav>-->
          <!--<b-nav-item to="/" exact>Home</b-nav-item>-->
          <!--<b-nav-item to="/public">Public</b-nav-item>-->
          <!--<b-nav-item to="/secure">Secure</b-nav-item>-->
        <!--</b-navbar-nav>-->
        <!--<b-navbar-nav class="ml-auto">-->
          <!--<template v-if="$auth.$state.loggedIn">-->
            <!--<b-nav-item-dropdown :text="$auth.user.name" right>-->
              <!--<b-dropdown-item @click="$auth.logout()">Logout</b-dropdown-item>-->
            <!--</b-nav-item-dropdown>-->
            <!--<b-img :src="picture" class="mt-1" rounded="circle" width="30px" height="30px"/>-->
          <!--</template>-->
          <!--<template v-else>-->
            <!--<b-dropdown-item to="/login">Login</b-dropdown-item>-->
          <!--</template>-->
        <!--</b-navbar-nav>-->
      <!--</b-collapse>-->
    <!--</b-navbar>-->
    <!--<b-container class="mt-4">-->
      <nuxt/>
    <!--</b-container>-->
  </div>
</template>

<style>
  html {
    font-family: "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    word-spacing: 1px;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
  }

  *, *:before, *:after {
    box-sizing: border-box;
    margin: 0;
  }

  .button--green {
    display: inline-block;
    border-radius: 4px;
    border: 1px solid #3b8070;
    color: #3b8070;
    text-decoration: none;
    padding: 10px 30px;
  }

  .button--green:hover {
    color: #fff;
    background-color: #3b8070;
  }

  .button--grey {
    display: inline-block;
    border-radius: 4px;
    border: 1px solid #35495e;
    color: #35495e;
    text-decoration: none;
    padding: 10px 30px;
    margin-left: 15px;
  }

  .button--grey:hover {
    color: #fff;
    background-color: #35495e;
  }
</style>
