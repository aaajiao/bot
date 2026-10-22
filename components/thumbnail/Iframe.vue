<template>
  <div class="iframe-wrapper">
    <iframe
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      :src="source"
      :style="styleObj"></iframe>
  </div>
</template>

<script>
  export default {
    props: ['source', 'dW', 'dH'],
    computed: {
      styleObj: function () {
        let ratio = this.dW / 1200
        let height = 1200 * this.dH / this.dW
        return {
          width: '1200px',
          height: height,
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
  .iframe-wrapper {
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
  }

  iframe {
    width: 1200px;
    height: 2000px;
    border: 0;
    transform-origin: 0 0;
    -moz-transform-origin: 0 0;
    -o-transform-origin: 0 0;
    -webkit-transform-origin: 0 0;
  }
</style>