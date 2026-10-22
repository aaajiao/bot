<template>
  <img :src="source">
</template>

<script>
  export default {
    props: ['source'],
    mounted: function () {
      this.$el.addEventListener('load', (e) => {
        let aspect = this.$el.naturalWidth / this.$el.naturalHeight
        this.$emit('aspectUpdate', aspect)
      })
    }
  }
</script>

<style scoped>
  img {
    object-fit: fill;
    width: 100% !important;
  }
</style>