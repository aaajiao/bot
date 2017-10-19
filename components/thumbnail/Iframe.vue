<template>
  <div class="wrapper" :style="{height: dH+'px'}">
    <iframe :src="source" :style="styleObj"></iframe>
  </div>
</template>

<script>
  export default {
    props: ['source', 'dW', 'dH'],
    computed: {
      styleObj: function () {
        let ratio = this.dW / 1000
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