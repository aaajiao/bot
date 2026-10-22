<template>
  <div id="stage"
       @mousedown.left.stop.prevent="cleanAllSelected">
    <div class="bg"
         :style="{width:width+'px', height:height+'px'}"></div>
    <div class="field is-grouped">
      <p class="control">
        <a id="add-button"
           class="button is-medium is-primary is-outlined"
           @mousedown.left.stop.prevent="addItem">
          <span class="icon is-small">
            <fa-icon :icon="fas.faPlus"/>
            <!--            <i class="fa fa-plus"></i>-->
          </span>
        </a>
      </p>
      <p class="control">
        <a id="save-all-button"
           class="button is-medium is-danger is-outlined"
           @mousedown.left.stop.prevent="saveAll">
          <span class="icon is-small">
            <fa-icon :icon="far.faSave"/>
          </span>
        </a>
      </p>
      <p class="control">
        <a id="preview"
           target="_blank"
           :href="'/'+project_id"
           class="button is-medium is-primary is-outlined">
            <span class="icon is-small">
              <fa-icon :icon="fas.faEye"/>
            </span>
        </a>
      </p>
    </div>

    <!--<p id="list" class="control">-->
    <!--<a class="button is-medium is-primary is-outlined"-->
    <!--@mousedown.left.stop.prevent="cleanAllSelected">-->
    <!--<span class="icon is-small">-->
    <!--<i class="fa fa-list"></i>-->
    <!--</span>-->
    <!--</a>-->
    <!--</p>-->

    <item v-for="(item, index) in items"
          ref="container"
          :itemData="item"
          :pId="project_id"
          :key="item.id"
          :index="index"
          :selectedIdx="selectedIdx"
          @select="onSelect"
          @removeItem="removeItem(index)"
          @markAsOld="index => items[index].new = false"
          @updateItemData="updateItemData"
          @updateItemTime="updateItemTime"
    ></item>

    <aside v-show="selectedIdx === null && items.length"
           class="menu"
           @mousedown.left.stop="">
      <p class="menu-label">
        元件列表
      </p>
      <ul class="menu-list item-list">
        <li class="item"
            v-for="(item, index) in items"
            v-show="!item.new"
            v-dragging="{ item: item, list: items, group: 'media' }"
            :key="index">
          <div class="field is-horizontal">
            <div class="field-label is-small">
              <span class="icon is-small"
                    @mousedown.left.prevent="toggleDisplay(index)">
                 <fa-icon :icon="item.show?fas.faEye:faEyeSlash"/>
              </span>
            </div>
            <div class="field-label is-small">
              <label class="label">{{ item.TUID }}</label>
            </div>
            <div v-if="item.startTime !==undefined"
                 class="field-label is-small">
              <label class="label">S</label>
            </div>
            <div v-if="item.startTime !==undefined"
                 class="field-body">
              <div class="field">
                <p class="control">
                  <input class="input is-small"
                         type="number"
                         :value="item.sTimeMin"
                         @change="upSTimeMin(index, $event)"
                  >
                </p>
              </div>
              <div class="field">
                <p class="control">
                  <input class="input is-small"
                         type="number"
                         :value="item.sTimeSec"
                         @change="upSTimeSec(index, $event)"
                  >
                </p>
              </div>
            </div>
            <div v-if="item.type!=='video' && item.type!=='audio'"
                 class="field-label is-small">
              <label class="label">E</label>
            </div>
            <div v-if="item.type!=='video' && item.type!=='audio'"
                 class="field-body">
              <div class="field">
                <p class="control">
                  <input class="input is-small"
                         type="number"
                         :value="item.eTimeMin"
                         @change="upETimeMin(index, $event)"
                  >
                </p>
              </div>
              <div class="field">
                <p class="control">
                  <input class="input is-small"
                         type="number"
                         :value="item.eTimeSec"
                         @change="upETimeSec(index, $event)"
                  >
                </p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </aside>
    <!--<container v-for="c in media-containers" :key="c.id"></container>-->
  </div>
</template>

<script>
import Item from '~/components/Item.vue'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'

const alphArr = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
]

function convertInt2Alph (i) {
  let temp = i
  let str  = ''
  if (temp === 0) return '0'
  while (temp > 0) {
    let x = temp % 62
    temp  = Math.floor(temp / 62)
    str   = alphArr[x] + str
  }
  return str
}

function genTUID (items) {
  let result = ''
  let tIdx   = items.length
  while (!result) {
    let temp  = convertInt2Alph(tIdx++)
    let match = false
    for (let i = 0; i < items.length; i++) {
      if (!items[i].TUID) throw Error('TUID is not exist')
      if (items[i].TUID === temp) {
        match = true
        break
      }
    }
    if (!match) {
      result = temp
    }
  }
  return result
}

export default {
  components: {
    Item
  },
  async asyncData ({ app, params }) {
    let { data } = await app.$axios.post(`/api/project/${params.id}`)

    for (let i = 0; i < data.items.length; i++) {
      let sTimeSec           = Math.round(data.items[i].startTime / 1000) % 60
      let sTimeMin           = (Math.round(data.items[i].startTime / 1000) - sTimeSec) / 60
      let eTimeSec           = Math.round(data.items[i].endTime / 1000) % 60
      let eTimeMin           = (Math.round(data.items[i].endTime / 1000) - eTimeSec) / 60
      data.items[i].sTimeSec = sTimeSec
      data.items[i].sTimeMin = sTimeMin
      data.items[i].eTimeSec = eTimeSec
      data.items[i].eTimeMin = eTimeMin
      data.items[i].show     = true
    }
    return { project_id: params.id, items: data.items, width: data.width, height: data.height }
  },
  mounted () {
    // this.$dragging.$on('dragged', ({ value }) => {
    //   console.log('drag')
    //   console.log(value.item)
    //   console.log(value.list)
    //   console.log(value.otherData)
    // })
    const vm = this
    this.$dragging.$on('dragend', () => {
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].zIndex = 9999 - i
      }
    })
    window.addEventListener('keyup', function (event) {
      if (event.keyCode === 27) {
        vm.cleanAllSelected()
      }
    })
  },
  data: function () {
    return {
      selectedIdx: null
    }
  },
  computed: {
    fas () {
      return fas // NOT RECOMMENDED
    },
    far () {
      return far
    }
  },
  methods: {
    toggleDisplay: function (idx) {
      this.items[idx].show = !this.items[idx].show
    },
    updateType: function (val, idx) {
      // console.log(val)
      // console.log(index)
      this.items[idx].type = val
    },
    updateSource: function (val, idx) {
      // console.log(val)
      // console.log(idx)
      this.items[idx].source = val
    },
    updateItemTime: function (tag, val, idx) {
      switch (tag) {
        case 'sMin':
          this.items[idx].sTimeMin = parseInt(val)
          break
        case 'sSec':
          this.items[idx].sTimeSec = parseInt(val)
          break
        case 'eMin':
          this.items[idx].eTimeMin = parseInt(val)
          break
        case 'eSec':
          this.items[idx].eTimeSec = parseInt(val)
          break
      }
    },
    upSTimeMin: function (i, e) {
      this.items[i].sTimeMin = e.target.value
    },
    upSTimeSec: function (i, e) {
      this.items[i].sTimeSec = e.target.value
    },
    upETimeMin: function (i, e) {
      this.items[i].eTimeMin = e.target.value
    },
    upETimeSec: function (i, e) {
      this.items[i].eTimeSec = e.target.value
    },
    onSelect: function (index) {
      this.selectedIdx = index
    },
    updateItemData: function (index, data) {
      // console.log(data)
      // console.log(index)
      // console.log(this.items)
      data.show = true
      this.items.splice(index, 1, data)
    },
    addItem () {
      this.items.push({
                        TUID: genTUID(this.items),
                        new: true,
                        show: true,
                        zIndex: 9999 - this.items.length + 1
                      })
    },
    removeItem: async function (index) {
      let item = this.items[index]
      if (item.new) {
        this.items.splice(index, 1)
      } else {
        try {
          let { data } = await this.$axios.post(item.url_delete)
          if (data.success) {
            this.items.splice(index, 1)
          }
        } catch (err) {
          console.log(err)
        }
      }
    },
    saveAll: async function () {
      this.$refs.container.forEach(function (item) {
        item.save()
      })
      // TODO: loop to see if a item is new or not
      // TODO: if new, create it
      // TODO: if not, update it
      // TODO: when all item saved, save project itself
    },
    cleanAllSelected () {
      this.selectedIdx = null
    }
  }
}
</script>

<style>
html {
  overflow: hidden;
}

#stage {
  position: absolute;
  width: 100vw;
  height: 100vh;
}

.dropdown {
  z-index: 99999;
}

.bg {
  position: absolute;
  top: 0;
  left: 0;
  background: black;
}

.menu {
  padding: 0.5rem 0;
  border-radius: 3px;
  box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
  position: absolute;
  right: 40px;
  top: 40px;
  background: white;
  z-index: 99999;
}

.menu .menu-label {
  font-size: 1rem;
  font-weight: 400;
  min-width: 8rem;
  text-align: center;
}

.menu-list li {
  padding: 0.2rem 1rem;
}

.menu-list li:hover {
  background: gainsboro;
}

.menu-list li input {
  width: 2rem;
  min-width: 2rem;
}

.menu-list li .label {
  width: unset;
}

.menu-list li .field-label.is-small {
  margin-left: 0.5rem;
  margin-right: 0.2rem;
  vertical-align: middle;
}

.menu-list li .field-body > .field:not(:last-child) {
  margin-right: 0.25rem;
}

#list {
  position: absolute;
  top: 40px;
  right: 80px;
}

#list .button {
  width: 36px;
  height: 36px;
}

.is-grouped {
  position: absolute;
  left: 40px;
  top: 40px;
  z-index: 99999;
}

.field.is-horizontal {
  display: inline-flex;
}

.button.is-danger.is-outlined, .button.is-primary.is-outlined {
  background-color: white;
}
</style>
