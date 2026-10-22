<template>
  <div class="wrapper"
       :style="{left: option.x+'px', top: option.y+'px', height: option.height +'px', visibility: show?'visible':'hidden','z-index':option.zIndex}">
    <iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            :id="option.id"
            :style="styleObj"
            :src="option.link">
    </iframe>
  </div>
</template>

<script>
  import Media from '~/components/AbstractMedia.vue'

  export default {
    extends: Media,
    computed: {
      styleObj: function () {
        let ratio = this.option.width / 1000
        return {
          'background': '#fff',
          'overflow': 'auto',
          'transform': `scale(${ratio})`,
          '-moz-transform': `scale(${ratio})`,
          '-o-transform': `scale(${ratio})`,
          '-webkit-transform': `scale(${ratio})`
        }
      }
    }
  }
</script>

<style scoped>
  .wrapper {
    position: absolute;
    padding: 0;
    overflow: hidden;
  }

  iframe {
    width: 1000px;
    height: 2000px;
    border: 0;
    transform-origin: 0 0;
    -moz-transform-origin: 0 0;
    -o-transform-origin: 0 0;
    -webkit-transform-origin: 0 0;
  }
</style>