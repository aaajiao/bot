<template>
  <img :src="source">
</template>

<script>
  export default {
    props: ['source'],
    mounted: function () {
      this.$el.addEventListener('load', (e) => {
        let aspect = this.$el.clientWidth / this.$el.clientHeight
        this.$emit('aspectUpdate', aspect)
      })
    }
  }
</script>

<style scoped>
  img {
    object-fit: fill;
  }
</style>