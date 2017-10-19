<template>
  <video controls preload="metadata"
         ref="container"
         :src="source"></video>
</template>

<script>
  export default {
    props: ['source', 'dW'],
    mounted: function () {
      this.$el.addEventListener('loadedmetadata', (e) => {
        let aspect = this.$el.videoWidth / this.$el.videoHeight
        this.$emit('aspectUpdate', aspect)
        let duration = Math.floor(this.$el.duration * 1000)
        this.$emit('durationUpdate', duration)
      })
    }
  }
</script>

<style scoped>
  video {
    width: 100%;
    object-fit: fill;
  }
</style>