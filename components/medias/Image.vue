<template>
  <img v-show="show"
       :id="option.id"
       :style="{width:option.width + 'px',left: option.x+'px', top: option.y+'px'}"
       :src="option.source">
</template>

<script>
  import Media from '~/components/AbstractMedia.vue'

  export default {
    extends: Media
  }
</script>

<style scoped>
  img {
    position: absolute;
    object-fit: fill;
  }
</style>