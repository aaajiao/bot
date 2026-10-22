<template>
  <div class="null"><slot>no content</slot></div>
</template>

<script>
  export default {
    props: ['source']
  }
</script>

<style>
  .null {
    width: 100%;
    height: 100%;
    display: flex;
    background: white;
    align-items: center;
    justify-content: center;
  }
</style>