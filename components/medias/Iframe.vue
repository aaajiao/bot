<template>
  <div class="wrapper" :style="{left: option.x+'px', top: option.y+'px', height: option.height +'px', visibility: show?'visible':'hidden'}">
    <iframe :id="option.id"
            :style="styleObj"
            :src="option.source">
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
    position:absolute;
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