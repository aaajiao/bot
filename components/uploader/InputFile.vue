<template>
  <label class="file-label">
    <input
      class="file-input"
      type="file"
      :name="$parent.name"
      :id="$parent.inputId || $parent.name"
      :accept="$parent.accept"
      @change="change"
      :webkitdirectory="$parent.directory && $parent.features.directory"
      :directory="$parent.directory && $parent.features.directory"
      :multiple="$parent.multiple && $parent.features.html5"
    />
    <span class="file-cta">
      <span class="file-icon">
        <fa-icon :icon="fas.faUpload"/>
      </span>
      <span class="file-label">
        Choose a file…
      </span>
    </span>
  </label>
</template>
<script>
import { fas } from '@fortawesome/free-solid-svg-icons'
  export default {
    methods: {
      change (e) {
        this.$destroy()
        this.$parent.addInputFile(e.target)
        // eslint-disable-next-line
        new this.constructor({
          parent: this.$parent,
          el: this.$el
        })
      }
    },
    computed: {
      fas () {
        return fas // NOT RECOMMENDED
      }
    }
  }
</script>
