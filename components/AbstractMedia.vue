<template>
  <h1>hello I'am Media</h1>
</template>

<script>
  export default {
    props: ['option'],
    data: function () {
      return {
        show: false
      }
    },
    methods: {
      run: function () {
        setTimeout(() => {
          this.show = true
        }, this.option.startTime)
        setTimeout(() => {
          this.show = false
        }, this.option.endTime)
      }
    },
    mounted: function () {
      this.run()
    }
//    data: function () {
//      return {
//        id: '5',
//        type: '',
//        startTime: 0,
//        endTime: -1,
//        pos: 0,
//        size: 0,
//        url: ''
//      }
//    },
//    created: function (options) {
//      this.id = options.id
//      this.type = options.type || 'image'
//      this.startTime = options.startTime || 0
//      this.endTime = options.endTime || -1
//      this.pos = options.pos || {x: 100, y: 100}
//      this.size = options.size || {x: 100, y: 100}
//      this.url = options.url || ''
//    }
  }
</script>

<style scoped>

</style>