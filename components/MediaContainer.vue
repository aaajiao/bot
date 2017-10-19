<template>
  <div>
    <componet v-for="option in medias" :is="'m-'+option.type" :option="option" :key="option._id">
    </componet>
  </div>
</template>

<script>
  import Image from '~/components/medias/Image.vue'
  import Video from '~/components/medias/Video.vue'
  import Iframe from '~/components/medias/Iframe'
  import Audio from '~/components/medias/Audio'

  export default {
    props: ['medias'],
    components: {
      'm-image': Image,
      'm-video': Video,
      'm-iframe': Iframe,
      'm-audio': Audio
    }
  }
</script>

<style>
</style>