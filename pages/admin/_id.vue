<template>
  <div id="stage">
    <div class="field is-grouped">
      <p class="control">
        <a id="add-button"
           class="button is-medium is-primary is-outlined"
           @click.prevent="addItem">
          <span class="icon is-small">
            <i class="fa fa-plus"></i>
          </span>
        </a>
      </p>
      <p class="control">
        <a id="save-all-button"
           class="button is-medium is-danger is-outlined"
           @click.prevent="saveAll">
          <span class="icon is-small">
            <i class="fa fa-floppy-o"></i>
          </span>
        </a>
      </p>
    </div>
    <div class="field" id="preview">
      <p class="control">
        <a :href="'/'+project_id"
           class="button is-medium is-primary is-outlined">
            <span class="icon is-small">
              <i class="fa fa-eye"></i>
            </span>
        </a>
      </p>
    </div>
    <container v-for="(item, index) in items"
               ref="containers"
               :itemData="item"
               :pId="project_id"
               :key="item.id"
               :index="index"
               @removeItem="removeItem(index)"
               @markAsOld="index => items[index].new = false"
               @updateItemData="updateItemData"
    ></container>
    <!--<container v-for="c in media-containers" :key="c.id"></container>-->
  </div>
</template>

<script>
  import Container from '~/components/DragResizableContainer.vue'
  import axios from '~/plugins/axios'

  export default {
    components: {
      Container
    },
    async asyncData ({params}) {
      let {data} = await axios.get(`/api/project/${params.id}`)
      return {project_id: params.id, items: data}
    },
    methods: {
      updateItemData: function (index, data) {
        this.items.splice(index, 1, data)
      },
      addItem () {
        this.items.push({
          new: true
        })
      },
      removeItem: async function (index) {
        let item = this.items[index]
        if (item.new) {
          this.items.splice(index, 1)
        } else {
          let {data} = await axios.post(item.url_delete)
          if (data.success) {
            this.items.splice(index, 1)
          }
        }
      },
      saveAll: async function () {
        this.$refs.containers.forEach(function (item) {
          item.save()
        })
        // TODO: loop to see if a item is new or not
        // TODO: if new, create it
        // TODO: if not, update it
        // TODO: when all item saved, save project itself
      }
    }
  }
</script>

<style>
  #stage {
    position: absolute;
    width: 100vw;
    height: 100vh;
    background-color: black;
  }

  .is-grouped, #preview {
    position: absolute;
    left: 40px;
    top: 40px;
    z-index: 99999;
  }

  #preview {
    left: unset;
    right: 40px;
  }

  .button.is-danger.is-outlined, .button.is-primary.is-outlined {
    background-color: white;
  }
</style>