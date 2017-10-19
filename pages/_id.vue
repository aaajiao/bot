<template>
  <div id="stage">
    <media-container :medias="medias"/>
    <!--<logo/>-->
    <!--<h1 class="title">-->
    <!--crazyplayer-->
    <!--</h1>-->
    <!--<h2 class="subtitle">-->
    <!--A Player for Dom Elements-->
    <!--</h2>-->
    <!--<div class="links">-->
    <!--<a href="https://nuxtjs.org/" target="_blank" class="button&#45;&#45;green">Documentation</a>-->
    <!--<a href="https://github.com/nuxt/nuxt.js" target="_blank" class="button&#45;&#45;grey">GitHub</a>-->
    <!--</div>-->

  </div>
</template>

<script>
  import Logo from '~/components/Logo.vue'
  import MediaContainer from '~/components/MediaContainer.vue'
  import axios from '~/plugins/axios'

  export default {
    components: {
      MediaContainer,
      Logo
    },
    async asyncData ({params}) {
      let {data} = await axios.get(`/api/project/${params.id}`)
      return {medias: data}
    }
  }
</script>

<style scoped>
  #stage {
    position: absolute;
    width: 100vw;
    height: 100vh;
  }

  .container {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .title {
    font-family: "Quicksand", "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; /* 1 */
    display: block;
    font-weight: 300;
    font-size: 100px;
    color: #35495e;
    letter-spacing: 1px;
  }

  .subtitle {
    font-weight: 300;
    font-size: 42px;
    color: #526488;
    word-spacing: 5px;
    padding-bottom: 15px;
  }

  .links {
    padding-top: 15px;
  }
</style>
