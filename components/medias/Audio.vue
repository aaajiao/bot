<template>
  <audio v-show="show"
         :width="option.width + 'px'"
         :height="option.height +'px'"
         :style="{left: option.x+'px', top: option.y+'px', display:'none'}"
         :src="source">
  </audio>
</template>

<script>
  import Media from '~/components/AbstractMedia.vue'

  export default {
    extends: Media,
    methods: {
      run: function () {
        setTimeout(() => {
          this.show = true
          this.$el.play()
          this.$el.onended = (e) => {
            this.show = false
          }
        }, this.option.startTime)
      }
    },
    data: function () {
      return {
        source: ''
      }
    },
    mounted: function () {
      this.$el.pause()
      this.source = this.option.source + '?time=' + new Date().getTime()
    }
  }
</script>

<style scoped>
  audio {
    position: absolute;
  }
</style>