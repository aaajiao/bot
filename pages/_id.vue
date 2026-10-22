<template>
  <div id="stage" :style="{background: color, width:width+'px', height:height+'px'}">
    <media-container :medias="medias"/>
  </div>
</template>

<script>
  import Logo from '~/components/Logo.vue'
  import MediaContainer from '~/components/MediaContainer.vue'

  export default {
    auth: false,
    components: {
      MediaContainer,
      Logo
    },
    async asyncData ({ app, params }) {
      let { data } = await app.$axios.post(`/api/project/${params.id}`)
      if (data.endTime && data.link) {
        setTimeout((link) => {
          window.location.href = link
        }, data.endTime, data.link)
      }
      return {
        medias: data.items,
        color: data.color,
        width: data.width,
        height: data.height,
        endTime: data.endTime,
        link: data.link
      }
    }
  }
</script>

<style scoped>
  #stage {
    position: absolute;
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
