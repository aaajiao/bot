<template>
  <div>
    <div v-show="source" class="card-image">
      <figure class="image">
        <!--<video v-if="fileType==='video'" autoplay controls preload="metadata" ref="container" :src="option.url"></video>-->
        <!--<img :src="option.url" alt="Placeholder image" ref="container">-->
        <component @aspectUpdate="updateAspect"
                   @durationUpdate="updateDuration"
                   :is="'m-'+fileType"
                   :source="source"
                   :dW="upData.size.width"
                   :dH="cHeight"
                   ref="box"></component>
        <button class="delete"
                @click="resetAll"
                style="position: absolute; top:6px; right:12px;"></button>
      </figure>
    </div>
    <div class="card-content">
      <div class="field">
        <file-upload v-if="!isIframe"
                     class="file is-fullwidth"
                     v-model="files"
                     post-action="/"
                     :drop="true"
                     @input-file="inputFile"
                     @input-filter="inputFilter">
        </file-upload>
      </div>
      <div v-if="isIframe" class="field">
        <label class="label">链接</label>
        <p class="control">
          <input class="input"
                 type="text"
                 @change="setIframeUrl"
                 :value="source"
                 placeholder="http://">
        </p>
      </div>
      <div class="field is-horizontal">
        <div class="field-label">
          <label class="label">网页</label>
        </div>
        <div class="field-body">
          <div class="field">
            <div class="control">
              <label class="checkbox">
                <input type="checkbox"
                       v-model="isIframe">
                是
              </label>
            </div>
          </div>
        </div>
      </div>
      <div v-if="type!=='null'">
        <div v-if="type!=='audio'" class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">位置</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="number" placeholder="X"
                       :value="upData.pos.x"
                       @change="updatePosX">
              </p>
            </div>
            <div class="field">
              <p class="control">
                <input class="input" type="number" placeholder="Y"
                       :value="upData.pos.y"
                       @change="updatePosY">
              </p>
            </div>
          </div>
        </div>
        <div v-if="type!=='audio'" class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">大小</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control">
                <input class="input" type="number" placeholder="width"
                       :value="upData.size.width"
                       @change="updateSizeWidth">
              </p>
            </div>
            <div v-if="isIframe" class="field">
              <p class="control">
                <input class="input" type="number" placeholder="height"
                       v-model="cHeight">
              </p>
            </div>
            <div v-else-if="fileType==='image' || fileType ==='video'" class="field">
              <p class="control">
                <input class="input" type="number" placeholder="auto"
                       :value="height"
                       @change="updateSizeHeight"
                       disabled>
              </p>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">开始</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control has-icons-right">
                <input class="input"
                       type="number"
                       v-model="sTimeMin">
                <span class="icon is-right">
                  min
                </span>
              </p>
            </div>
            <div class="field">
              <p class="control has-icons-right">
                <input class="input"
                       type="number"
                       v-model="sTimeSec">
                <span class="icon is-right">
                  sec
                </span>
              </p>
            </div>
          </div>
        </div>
        <div v-if="type!=='video'&&type!=='audio'" class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">结束</label>
          </div>
          <div class="field-body">
            <div class="field">
              <p class="control has-icons-right">
                <input class="input"
                       type="number"
                       v-model="eTimeMin">
                <span class="icon is-right">
                  min
                </span>
              </p>
            </div>
            <div class="field">
              <p class="control has-icons-right">
                <input class="input"
                       type="number"
                       v-model="eTimeSec">
                <span class="icon is-right">
                  sec
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!--<div>-->
  <!--<componet v-if="files[0]" :is="'m-'+ type" :option="option"/>-->
  <!--<file-upload v-model="files"-->
  <!--post-action="/"-->
  <!--:drop="true"-->
  <!--@input-file="inputFile"-->
  <!--@input-filter="inputFilter">Upload file-->
  <!--</file-upload>-->
  <!--</div>-->
</template>
<style>
  input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
  }
</style>
<script>
  import FileUpload from '~/components/uploader/index.js'
  import Image from '~/components/thumbnail/Image.vue'
  import Video from '~/components/thumbnail/Video.vue'
  import Iframe from '~/components/thumbnail/Iframe.vue'
  import Audio from '~/components/thumbnail/Audio.vue'
  import mNull from '~/components/thumbnail/Null.vue'

  export default {
    props: ['upData'],
    components: {
      FileUpload,
      'm-image': Image,
      'm-video': Video,
      'm-iframe': Iframe,
      'm-audio': Audio,
      'm-null': mNull
    },
    data () {
      return {
        fileChanged: false,
        isIframe: false,
        fileType: this.upData.itemData.type || 'null',
        source: null,
        files: [],
        aspect: 0,
        cHeight: this.upData.itemData.height || 200,
        sTimeMin: 0,
        sTimeSec: 0,
        eTimeMin: 0,
        eTimeSec: 0,
        duration: 0
      }
    },
    created: function () {
      let iData = this.upData.itemData
      if (iData.type === 'iframe') {
        this.isIframe = true
      }
      this.startTime = iData.startTime || 0
      this.endTime = iData.endTime || 0
      this.source = this.upData.itemData.source
    },
    watch: {
      isIframe: function (newValue) {
        if (newValue) {
          this.fileType = 'iframe'
          // this.resetTime()
        } else {
          this.fileType = 'null'
        }
      },
      startTime: function () {
        if (this.duration > 0) {
          this.endTime = this.startTime + this.duration
        }
      }
    },
    computed: {
      height: function () {
        let result
        if (this.aspect === 0) {
          result = 0
        } else {
          result = Math.round(this.upData.size.width / this.aspect)
        }
        return result
      },
      type: function () {
        if (this.isIframe) {
          return 'iframe'
        } else {
          if (this.fileType) {
            return this.fileType
          } else {
            return 'null'
          }
        }
      },
      startTime: {
        get: function () {
          return (this.sTimeMin * 60 + this.sTimeSec) * 1000
        },
        set: function (newValue) {
          this.sTimeSec = Math.round(newValue / 1000) % 60
          this.sTimeMin = (Math.round(newValue / 1000) - this.sTimeSec) / 60
        }
      },
      endTime: {
        get: function () {
          return (this.eTimeMin * 60 + this.eTimeSec) * 1000
        },
        set: function (newValue) {
          this.eTimeSec = Math.round(newValue / 1000) % 60
          this.eTimeMin = (Math.round(newValue / 1000) - this.eTimeSec) / 60
        }
      }
    },
    methods: {
      updateDuration: function (duration) {
        this.duration = duration
      },
      resetTime: function () {
        this.sTimeMin = 0
        this.sTimeSec = 0
        this.eTimeMin = 0
        this.eTimeSec = 0
        this.duration = 0
      },
      resetAll: function () {
        this.isIframe = false
        this.fileType = null
        this.source = null
        this.files = []
        this.aspect = 0
        this.cHeight = 100
        this.resetTime()
      },
      setIframeUrl: function (e) {
        if (/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/.test(e.target.value)) {
          this.source = e.target.value
        }
      },
      updateAspect: function (val) {
        this.aspect = val
      },
      updatePosX: function (e) {
        this.$emit('update:posX', e.target.value)
      },
      updatePosY: function (e) {
        this.$emit('update:posY', e.target.value)
      },
      updateSizeWidth: function (e) {
        this.$emit('update:sizeW', e.target.value)
      },
      updateSizeHeight: function (e) {
        this.$emit('update:sizeH', e.target.value)
      },
      inputFile: function (newFile, oldFile) {
        if (newFile && oldFile && !newFile.active && oldFile.active) {
          console.log('response', newFile.response)
          if (newFile.xhr) {
            console.log('status', newFile.xhr.status)
          }
        }
      },
      inputFilter: function (newFile, oldFile, prevent) {
        if (newFile || (!newFile && oldFile)) {
          this.fileChanged = true
        }
        this.aspect = 0
        // this.resetTime()
        if (newFile && !oldFile) {
          if (!/\.(jpeg|jpe|jpg|gif|png|mp4|wav|mp3|webp)$/i.test(newFile.name)) {
            return prevent()
          }
        }
        if (/^image/.test(newFile.type)) {
          this.fileType = 'image'
        } else if (/^video/.test(newFile.type)) {
          this.fileType = 'video'
        } else if (/^audio/.test(newFile.type)) {
          this.fileType = 'audio'
        }
        newFile.blob = ''
        let URL = window.URL || window.webkitURL
        if (URL && URL.createObjectURL) {
          newFile.blob = URL.createObjectURL(newFile.file)
          this.source = newFile.blob
        }
      }
    }
  }
</script>