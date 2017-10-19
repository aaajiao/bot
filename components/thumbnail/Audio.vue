<template>
  <audio controls preload="metadata"
         :src="source||'#'"
         type="audio/mpeg"></audio>
</template>

<script>
  export default {
    props: ['source', 'dW'],
    mounted: function () {
      this.$el.pause()
      this.$el.addEventListener('loadedmetadata', (e) => {
        let duration = Math.floor(this.$el.duration * 1000)
        this.$emit('durationUpdate', duration)
      })
    }
  }
</script>

<style scoped>
  audio {
    width: 100%;
  }
</style>