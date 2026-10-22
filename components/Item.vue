<template>
  <div class="wrapper"
       @mousedown.left.stop="">
    <vue-draggable-resizable :w="width"
                             :h="height"
                             :x="x"
                             :y="y"
                             :active="isActive"
                             :aspect="aspect"
                             :style="{'z-index': itemData.zIndex}"
                             v-show="itemData.show"
                             v-on:dragging="onDrag"
                             v-on:resizing="onResize"
                             v-on:activated="onActivated"
                             :parent="false">
      <component class="thumbnail"
                 :is="'m-'+fileType"
                 :dW="width"
                 :dH="height"
                 :source="fileType==='iframe'?link:source">
      </component>
      <div class="tuid">{{ itemData.TUID }}</div>
    </vue-draggable-resizable>
    <div class="dropdown is-right"
         v-show="isActive"
         :class="{'is-active':showPanel}">
      <div class="dropdown-trigger"
           @click="triggerDisplay">
        <button class="button"
                aria-haspopup="true"
                aria-controls="dropdown-menu2">
          <!--<span>展开/收起</span>-->
          <span class="icon is-small">
            <fa icon="angle-down"></fa>
<!--        <i class="fa fa-angle-down"-->
<!--           aria-hidden="true"></i>-->
      </span>
        </button>
      </div>
      <div class="dropdown-menu"
           role="menu">
        <div class="dropdown-content">
          <div class="dropdown-item">
            <m-uploader ref="uploader"
                        :itemData="itemData"
                        :x="x"
                        :y="y"
                        :width="width"
                        :height="height"
                        v-on:update:x="onUpdateX"
                        v-on:update:y="onUpdateY"
                        v-on:update:width="onUpdateWidth"
                        v-on:update:height="onUpdateHeight"
                        v-on:update:aspect="onUpdateAspect"
                        v-on:update:time="onUpdateTime"
                        v-on:update:fileType="onUpdateFileType"
                        v-on:update:source="onUpdateSource"
                        v-on:update:link="onUpdateLink"
            ></m-uploader>
          </div>
          <div class="dropdown-item">
            <footer class="card-footer">
              <a href="javascript:void(0)"
                 class="card-footer-item"
                 @click.prevent="save">保存</a>
              <a href="javascript:void(0)"
                 class="card-footer-item"
                 @click.prevent="removeItem">删除</a>
              <!--<a href="javascript:void(0)" class="card-footer-item" @click.prevent="zIndex++">向前</a>-->
              <!--<a href="javascript:void(0)" class="card-footer-item"-->
              <!--@click.prevent="zIndex>1?zIndex&#45;&#45;:zIndex">向后</a>-->
            </footer>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueDraggableResizable from '~/components/DragResizableCard.vue'
import Uploader from '~/components/Uploader.vue'
import FormData from 'form-data'
import Image from '~/components/thumbnail/Image.vue'
import Video from '~/components/thumbnail/Video.vue'
import Iframe from '~/components/thumbnail/Iframe.vue'
import Audio from '~/components/thumbnail/Audio.vue'
import mNull from '~/components/thumbnail/Null.vue'

export default {
  components: {
    VueDraggableResizable,
    'm-uploader': Uploader,
    'm-image': Image,
    'm-video': Video,
    'm-iframe': Iframe,
    'm-audio': Audio,
    'm-null': mNull
  },
  props: [
    'pId',
    'selectedIdx',
    'itemData',
    'index'
  ],
  computed: {
    isActive: function () {
      return this.index === this.selectedIdx
    }
  },
  data: function () {
    return {
      // local
      showPanel: true,
      // for display
      aspect: 0,
      fileType: this.itemData.type || 'null',
      source: this.itemData.source || null,
      link: this.itemData.link || '',
      // size & position
      width: this.itemData.width || 100,
      height: this.itemData.height || 100,
      x: isNaN(this.itemData.x) ? 100 : this.itemData.x,
      y: isNaN(this.itemData.y) ? 100 : this.itemData.y
    }
  },
  methods: {
    onUpdateLink: function (val) {
      this.link = val || ''
    },
    onUpdateTime: function (tag, val) {
      this.$emit('updateItemTime', tag, val, this.index)
    },
    onUpdateAspect: function (val) {
      this.aspect = val
    },
    onUpdateFileType: function (val) {
      // this.$emit('updateType', val, this.index)
      this.fileType = val
    },
    onUpdateSource: function (val) {
      // console.log(val)
      // console.log(this.index)
      // this.$emit('updateSource', val, this.index)
      this.source = val
    },
    onUpdateX: function (val) {
      this.x = parseInt(val)
    },
    onUpdateY: function (val) {
      this.y = parseInt(val)
    },
    onUpdateWidth: function (val) {
      this.width = parseInt(val)
    },
    onUpdateHeight: function (val) {
      this.height = parseInt(val)
    },
    onActivated: function () {
      this.$emit('select', this.index)
    },
    onResize: function (x, y, width, height) {
      this.x      = x
      this.y      = y
      this.width  = width
      this.height = height
    },
    onDrag: function (x, y) {
      this.x = x
      this.y = y
    },
    triggerDisplay () {
      this.showPanel = !this.showPanel
    },
    removeItem: async function () {
      this.$swal({
                   title: '确认删除?',
                   icon: 'warning',
                   showCancelButton: true,
                   cancelButtonText: '取消',
                   confirmButtonText: '确认'
                 }).then((result) => {
        if (result.value) {
          this.$emit('removeItem', this.index)
        }
      })
    },
    save: async function () {
      let ins = this.$refs.uploader
      let f   = new FormData()
      f.append('TUID', this.itemData.TUID)
      f.append('type', ins.type)
      f.append('fileChanged', ins.fileChanged)
      f.append('startTime', (this.itemData.sTimeMin * 60 + this.itemData.sTimeSec) * 1000 || 0)
      f.append('endTime', (this.itemData.eTimeMin * 60 + this.itemData.eTimeSec) * 1000 || 0)
      f.append('x', this.x)
      f.append('y', this.y)
      f.append('width', this.width)
      f.append('height', this.height)
      f.append('zIndex', this.itemData.zIndex)
      f.append('project_id', this.pId)
      f.append('link', this.link)
      if (ins.files && ins.files[0]) {
        f.append('file', ins.files[0].file)
      }
      if (this.itemData.new) {
        let { data } = await this.$axios.post('/api/item/create', f, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (data.success) {
          this.$emit('markAsOld', this.index)
          ins.fileChanged = false
        }
        if (data.data) {
          if (data.success) {
            this.$swal({
                         title: '保存成功',
                         position: 'bottom-start',
                         showConfirmButton: false,
                         timer: 500
                       })
            ins.fileChanged = false
          }
          this.$emit('updateItemData', this.index, data.data)
        }
      } else {
        let { data } = await this.$axios.post(this.itemData.url_update, f, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (data.success) {
          this.$swal({
                       title: '保存成功',
                       position: 'bottom-start',
                       showConfirmButton: false,
                       timer: 500
                     })
          ins.fileChanged = false
        }
      }
      // let {data} = await axios.post()
    }
  }
}
</script>

<style>
img {
  display: block;
}

.tuid {
  position: absolute;
  font-size: 0.5rem;
  top: 0;
  right: 0;
  padding: 0 0.25rem;
  height: 1rem;
  line-height: 1rem;
  text-align: center;
  color: white;
  background: red;
}

.wrapper {
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 100%;
}

.dropdown-item {
  padding: 0;
}

.dropdown-content {
  padding: 0;
}

.wrapper > * {
  pointer-events: auto;
}

.thumbnail {
  width: 100%;
  pointer-events: none;
  background: white;
}

iframe {
  pointer-events: none;
}

.dropdown {
  position: absolute;
  top: 40px;
  left: unset;
  right: 40px;
}
</style>
