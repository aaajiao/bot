<template>
  <div class="drag-resizable-container"
       @mousemove="onMouseMove"
       @mousedown.left="onMouseDown"
       :style="boxStyle">
    <div class="card">
      <header class="card-header drag-handler"
              @mousedown.left="onMouseDown">
        <div class="card-header-title">
          [item {{index}}]
        </div>
        <div class="card-header-icon">
          <button class="delete" @click="remove"></button>
        </div>
      </header>
      <m-uploader :upData="{itemData,pos,size}"
                  ref="uploader"
                  @update:posX="val=>pos.x=Number(val)"
                  @update:posY="val=>pos.y=Number(val)"
                  @update:sizeW="val=>size.width=Number(val)"
                  @update:sizeH="val=>size.height=Number(val)"
      ></m-uploader>
      <footer class="card-footer">
        <a href="javascript:void(0)" class="card-footer-item" @click.prevent="save">保存</a>
        <a href="javascript:void(0)" class="card-footer-item" @click.prevent="zIndex++">向前</a>
        <a href="javascript:void(0)" class="card-footer-item"
           @click.prevent="zIndex>1?zIndex--:zIndex">向后</a>
      </footer>
    </div>
  </div>
</template>

<script>
  //  import _ from 'lodash'
  import Uploader from '~/components/Uploader.vue'
  import FormData from 'form-data'
  import axios from '~/plugins/axios'

  export default {
    components: {
      'm-uploader': Uploader
    },
    props: [
      'pId',
      'itemData',
      'index'
    ],
    data: function () {
      return {
        zIndex: this.itemData.zIndex || 50,
        hasFrame: true,
        isActived: false,
        clickedData: null,
        // Minimum resizable area
        pos: {
          x: this.itemData.x || 100,
          y: this.itemData.y || 100
        },
        size: {
          width: this.itemData.width || null,
          height: this.itemData.height || null
        },
        handles: {},
        minWidth: 300,
        minHeight: 200,
        // Thresholds
        SNAP_MARGINS: 5,
        BORDER: 1,
        RESIZE_PADDING_OUTER: 10,
        HANDLE_HEIGHT: 48,
        mouseOnHandle: false,
        mouseOnEdge: {
          top: false,
          left: false,
          bottom: false,
          right: false
        },
        touchScreenEdge: {
          top: false,
          left: false,
          bottom: false,
          right: false
        }
      }
    },
    mounted () {
      document.body.addEventListener('mouseup', this.onMouseUp, true)
      document.body.addEventListener('touchend', this.onTouchEnd, true)
      this.$nextTick(() => {
        this.matchSize()
      })
    },
    beforeDestroy () {
      document.documentElement.removeEventListener('mouseup', this.onMouseUp, true)
      document.documentElement.removeEventListener('touchend', this.onTouchEnd, true)
    },
    computed: {
      sizeHeight: function () {
        this.size.height = this.$el.clientHeight - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER)
      },
      boxStyle: function () {
        let v = {
          padding: this.RESIZE_PADDING_OUTER + 'px',
          left: (this.pos.x - this.RESIZE_PADDING_OUTER) + 'px',
          top: (this.pos.y - this.RESIZE_PADDING_OUTER) + 'px',
          cursor: this.cursorStyle,
          'z-index': this.zIndex
        }
        if (this.size.width && this.size.height) {
          v.width = (this.size.width + 2 * (this.RESIZE_PADDING_OUTER + this.BORDER)) + 'px'
          // v.height = (this.size.height + 2 * (this.RESIZE_PADDING_OUTER + this.BORDER)) + 'px'
        }
        return v
      },
      readyToResize: function () {
        return this.mouseOnEdge.top || this.mouseOnEdge.left || this.mouseOnEdge.bottom || this.mouseOnEdge.right
      },
      readyToMove: function () {
        return this.mouseOnHandle && !this.readyToResize
      },
      cursorStyle: function () {
        let m = this.mouseOnEdge
        let c = this.clickedData
        let s = 'default'
        let onRight = false
        let onBottom = false
        let onLeft = false
        let onTop = false
        if (c) {
          onRight = c.onTopEdge
          onBottom = c.onBottomEdge
          onLeft = c.onLeftEdge
          onTop = c.onTopEdge
        } else {
          onRight = m.right
          onBottom = m.bottom
          onLeft = m.left
          onTop = m.top
        }
        if (this.readyToMove) {
          s = 'move'
        } else {
          if (onRight || onLeft) {
            s = 'ew-resize'
          }
          if (onBottom || onTop) {
            s = 'ns-resize'
          }
          if ((onRight && onBottom) || (onLeft && onTop)) {
            s = 'nwse-resize'
          } else if ((onRight && onTop) || (onBottom && onLeft)) {
            s = 'nesw-resize'
          }
        }
        return s
      }
    },
    methods: {
      markAsOld: function () {
        this.$emit('markAsOld', this.index)
      },
      updateItemData: function (data) {
        this.$emit('updateItemData', this.index, data)
      },
      save: async function () {
        let ins = this.$refs.uploader
        let f = new FormData()
        f.append('message', 'hello world')
        f.append('type', ins.type)
        f.append('fileChanged', ins.fileChanged)
        f.append('startTime', ins.startTime)
        f.append('endTime', ins.endTime)
        f.append('x', this.pos.x)
        f.append('y', this.pos.y)
        f.append('width', this.size.width)
        f.append('height', ins.height || ins.cHeight)
        f.append('zIndex', this.zIndex)
        f.append('project_id', this.pId)
        if (ins.isIframe) {
          f.append('url', ins.source)
        } else if (ins.files && ins.files[0]) {
          f.append('file', ins.files[0].file)
        }
        if (this.itemData.new) {
          let {data} = await axios.post('/api/item/create', f, {
            headers: {'Content-Type': 'multipart/form-data'}
          })
          if (data.success) {
            this.markAsOld()
            ins.fileChanged = false
          }
          if (data.data) {
            this.updateItemData(data.data)
          }
        } else {
          let {data} = await axios.post(this.itemData.url_update, f, {
            headers: {'Content-Type': 'multipart/form-data'}
          })
          if (data.success) {
            ins.fileChanged = false
          }
          console.log(data)
        }
        // let {data} = await axios.post()
      },
      matchSize: function () {
        this.size.width = this.$el.clientWidth - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER)
        this.size.height = this.$el.clientHeight - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER)
      },
      remove: function () {
        this.$emit('removeItem', this.index)
      },
      release: function (e) {
        this.mouseOnEdge = {
          top: false,
          left: false,
          bottom: false,
          right: false
        }
        this.clickedData = null
      },
      calc: function (e) {
        let dx = e.clientX - this.pos.x
        let dy = e.clientY - this.pos.y

        let dMi = this.RESIZE_PADDING_OUTER
        let dMo = -this.RESIZE_PADDING_OUTER - this.BORDER

        let rMi = this.$el.clientWidth - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER) - this.RESIZE_PADDING_OUTER
        let rMo = this.$el.clientWidth - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER) + this.RESIZE_PADDING_OUTER + this.BORDER

        let bMi = this.$el.clientHeight - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER) - this.RESIZE_PADDING_OUTER
        let bMo = this.$el.clientHeight - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER) + this.RESIZE_PADDING_OUTER + this.BORDER

        let inLR = dx > dMo && dx < rMo
        let inTB = dy > dMo && dy < bMo

        this.mouseOnEdge.top = dy > dMo && dy <= dMi && inLR
        this.mouseOnEdge.left = dx > dMo && dx <= dMi && inTB
        this.mouseOnEdge.bottom = dy >= bMi && dy < bMo && inLR
        this.mouseOnEdge.right = dx >= rMi && dx < rMo && inTB

        this.mouseOnHandle = dy > 0 && dy <= this.HANDLE_HEIGHT && inLR
        this.touchScreenEdge.top = this.pos.y < this.SNAP_MARGINS
        this.touchScreenEdge.left = this.pos.x < this.SNAP_MARGINS
        this.touchScreenEdge.bottom = this.pos.y + this.$el.clientHeight > window.innerHeight - this.SNAP_MARGINS
        this.touchScreenEdge.right = this.pos.x + this.$el.clientWidth > window.innerWidth - this.SNAP_MARGINS
      },
      onDown: function (e) {
        this.calc(e)
        this.clickedData = {
          x: this.pos.x,
          y: this.pos.y,
          clickX: e.clientX,
          clickY: e.clientY,
          width: this.$el.clientWidth - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER),
          height: this.$el.clientHeight - 2 * (this.RESIZE_PADDING_OUTER + this.BORDER),
          readyToResize: this.readyToResize,
          readyToMove: this.readyToMove,
          onTopEdge: this.mouseOnEdge.top,
          onLeftEdge: this.mouseOnEdge.left,
          onBottomEdge: this.mouseOnEdge.bottom,
          onRightEdge: this.mouseOnEdge.right
        }
        this.isActive = true
      },
      onUp: function (e) {
        this.release(e)
        this.isActive = false
      },
      onMove: function (e) {
        this.calc(e)
      },
      onMouseDown: function (e) {
        this.onDown(e)
        document.documentElement.addEventListener('mousemove', this.onMouseMove, true)
      },
      onMouseMove: function (e) {
        this.onMove(e)
        if (e.target === this.$el) return
        if (this.clickedData && this.isActive) {
          if (this.clickedData.readyToMove) {
            this.pos.x = this.clickedData.x + e.clientX - this.clickedData.clickX
            this.pos.y = this.clickedData.y + e.clientY - this.clickedData.clickY
          }
          if (this.clickedData.readyToResize) {
            if (this.clickedData.onRightEdge) {
              this.size.width = Math.max(this.minWidth, e.clientX - this.clickedData.x)
            }
            if (this.clickedData.onBottomEdge) {
              this.size.height = Math.max(this.minHeight, e.clientY - this.clickedData.y)
            }
            if (this.clickedData.onLeftEdge) {
              let currentWidth = Math.max(this.clickedData.clickX - e.clientX + this.clickedData.width, this.minWidth)
              if (currentWidth > this.minWidth) {
                this.size.width = currentWidth
                this.pos.x = e.clientX
              }
            }
            if (this.clickedData.onTopEdge) {
              let currentHeight = Math.max(this.clickedData.clickY - e.clientY + this.clickedData.height, this.minHeight)
              if (currentHeight > this.minHeight) {
                this.size.height = currentHeight
                this.pos.y = e.clientY
              }
            }
          }
        }
      },
      onMouseUp: function (e) {
        this.onUp(e)
        document.documentElement.removeEventListener('mousemove', this.onMouseMove, true)
      },
      onTouchStart: function (e) {
        this.onDown(e.touches[0])
        document.documentElement.addEventListener('touchmove', this.onMouseMove, true)
      },
      onTouchMove: function (e) {
        this.onMove(e.touches[0])
        if (this.clicked && (this.clicked.readyToMove || this.clicked.readyToResize)) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      onTouchEnd: function (e) {
        this.release()
        if (e.touches.length === 0) this.onUp(e.changedTouches[0])
        document.documentElement.removeEventListener('touchmove', this.onMouseMove, true)
      }
    }
  }
</script>

<style>
  label {
    word-break: keep-all;
  }

  .drag-resizable-container {
    position: absolute;
  }

  .card {
    background-color: gray;
    height: 100%;
  }

  .content {
    height: 100%;
    width: 100%;
    border: 2px solid rgb(152, 148, 65);
    background: yellow;
    pointer-events: all;
  }

  .drag-handler {
    pointer-events: all;
    overflow: hidden;
    text-align: center;
    /*line-height: 28px;*/
    background-color: gray;
    color: rgb(55, 55, 65);
  }
</style>