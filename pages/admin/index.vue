<template>
  <div>
    <paginate name="projects"
              :list="projects"
              :per="8"
              class="projects"
    >
      <div class="columns is-multiline">
        <div class="column is-half-mobile is-one-third">
          <a id="add-button"
             class="button is-medium is-primary is-outlined"
             @click="addProject">
          <span class="icon is-small">
             <fa-icon :icon="fas.faPlus"/>
          </span>
          </a>
        </div>
        <div v-for="(project, index) in paginated('projects')"
             class="column is-half-mobile is-one-third">
          <div class="card">
            <header class="card-header drag-handler">
              <div class="card-header-title">
                <a target="_blank"
                   :href="project.adminUrl">
                  {{ project.title }} - [素材: {{ project.itemsCount }}]
                </a>
              </div>
            </header>
            <div class="card-content">
              <div class="field">
                <div class="control">
                  <input class="input is-primary"
                         type="text"
                         placeholder="Primary input"
                         @keyup.enter="save(index)"
                         v-model="project.title">
                </div>
              </div>
              <div class="field is-horizontal">
                <div class="field-label is-small">
                  <label class="label">W</label>
                </div>
                <div class="field-body">
                  <div class="field is-small">
                    <p class="control">
                      <input class="input"
                             type="number"
                             placeholder="w"
                             v-model="project.width">
                    </p>
                  </div>
                  <div class="field-label is-small">
                    <label class="label">H</label>
                  </div>
                  <div class="field is-small">
                    <p class="control">
                      <input class="input"
                             type="number"
                             placeholder="h"
                             v-model="project.height">
                    </p>
                  </div>
                </div>
              </div>
              <div class="field is-horizontal">
                <div class="field-label is-small">
                  <label class="label">M</label>
                </div>
                <div class="field-body">
                  <div class="field is-small">
                    <p class="control">
                      <input class="input"
                             type="number"
                             placeholder="m"
                             v-model="project.eTimeMin">
                    </p>
                  </div>
                  <div class="field-label is-small">
                    <label class="label">S</label>
                  </div>
                  <div class="field is-small">
                    <p class="control">
                      <input class="input"
                             type="number"
                             placeholder="s"
                             v-model="project.eTimeSec">
                    </p>
                  </div>
                </div>
              </div>
              <div class="field is-horizontal">
                <div class="field-label is-small">
                  <label class="label">LINK</label>
                </div>
                <div class="field-body">
                  <div class="field is-small">
                    <p class="control">
                      <input class="input"
                             type="text"
                             placeholder="http://"
                             v-model="project.link">
                    </p>
                  </div>
                </div>
              </div>
              <time datetime="">创建: {{ project.creatFormatted }}</time>
              <time datetime="">更新: {{ project.updateFormatted }}</time>
              <div id="color-picker"
                   :style="{background: project.color.hex}"
                   @mousedown.left="showColor(index)"></div>
              <chrome-picker v-if="project.showpicker"
                             v-model="project.color"/>
            </div>
            <footer class="card-footer">
              <a href="javascript:void(0)"
                 class="card-footer-item"
                 :value="project"
                 @click="save(index)">保存</a>
              <a target="_blank"
                 :href="project.adminUrl"
                 class="card-footer-item">编辑</a>
              <a href="javascript:void(0)"
                 class="card-footer-item has-text-danger"
                 @click="removeProject(index)">删除</a>
            </footer>
          </div>
        </div>
      </div>
    </paginate>
    <nav class="pagination is-right"
         role="navigation"
         aria-label="pagination">
      <paginate-links for="projects"
                      :limit="2"
                      :show-step-links="true"
                      :hide-single-page="true"
                      :step-links="{
                        next: '>',
                        prev: '<'
                      }"
                      :classes="{
                        'ul': 'pagination-list',
                        'li > a': 'pagination-link',
                        '.next > a': 'pagination-next',
                        '.prev > a': 'pagination-previous'
                      }"
      ></paginate-links>
    </nav>
  </div>
</template>
<style>
body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown), html.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown) {
  overflow: hidden;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.projects .card, .projects #add-button {
  margin: 40px;
}

.vc-chrome {
  position: absolute;
  left: 50px;
  top: 166px;
}

#color-picker {
  border: solid 1px black;
  margin-top: 10px;
  width: 20px;
  height: 20px;
}

.field.is-horizontal {
  display: inline-flex;
  align-items: center;
}

.field-label {
  text-align: left;
  margin-right: 0.25rem;
}

.input {
  font-size: 0.5rem;
}

.number {
  background-color: unset;
  border-radius: unset;
  font-size: unset;
  height: unset;
  margin-right: unset;
  padding: unset;
}

.pagination {
  margin: 80px 40px 0;
}

time {
  display: block;
  font-size: 0.5rem;
}
</style>
<script>
import { Chrome } from 'vue-color'
import { fas } from '@fortawesome/free-solid-svg-icons'

export default {
  middleware: ['auth'],
  async asyncData ({ app, params }) {
    let { data } = await app.$axios.post('/api/project')
    for (let i = 0; i < data.length; i++) {
      data[i].showpicker = false
      if (data[i].color === undefined) {
        data[i].color = {
          hex: '#FFFFFF'
        }
      } else {
        data[i].color = {
          hex: data[i].color
        }
      }
      if (!data[i].itemsCount) {
        data[i].itemsCount = 0
      }
      if (data[i].endTime) {
        data[i].eTimeSec = Math.round(data[i].endTime / 1000) % 60
        data[i].eTimeMin = (Math.round(data[i].endTime / 1000) - data[i].eTimeSec) / 60
      } else {
        data[i].eTimeSec = 0
        data[i].eTimeMin = 0
      }
    }
    return { projects: data }
  },
  computed: {
    fas () {
      return fas // NOT RECOMMENDED
    }
  },
  components: {
    'chrome-picker': Chrome
  },
  data: function () {
    return {
      paginate: ['projects']
    }
  },
  methods: {
    showColor: function (index) {
      this.projects[index].showpicker = !this.projects[index].showpicker
    },
    save: async function (index) {
      try {
        let project = this.projects[index]
        await this.$axios.post(project.url_update, {
          title: project.title,
          color: project.color.hex,
          width: project.width,
          height: project.height,
          endTime: (Number(project.eTimeMin) * 60 + Number(project.eTimeSec)) * 1000,
          link: project.link
        })
      } catch (err) {
        console.log(err)
      }
    },
    addProject: async function () {
      try {
        let { data }    = await this.$axios.post('/api/project/create', {})
        data.color      = {
          hex: '#FFFFFF'
        }
        data.showpicker = false
        data.itemsCount = 0
        this.projects.splice(this.projects.length, 0, data)
      } catch (err) {
        console.log(err)
      }
    },
    removeProject: async function (index) {
      this.$swal({
                   title: '确认删除?',
                   icon: 'warning',
                   showCancelButton: true,
                   cancelButtonText: '取消',
                   confirmButtonText: '确认'
                 }).then(async (result) => {
        if (result.value) {
          try {
            let project  = this.projects[index]
            let { data } = await this.$axios.post(project.url_delete)
            if (data.success) {
              this.projects.splice(index, 1)
            }
          } catch (err) {
            console.log(err)
          }
        }
      })
    }
  }
}
</script>
