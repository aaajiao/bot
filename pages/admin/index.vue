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
            <i class="fa fa-plus"></i>
          </span>
          </a>
        </div>
        <div v-for="(project, index) in paginated('projects')"
             class="column is-half-mobile is-one-third">
          <div class="card">
            <header class="card-header drag-handler">
              <div class="card-header-title">
                <a href="project.adminUrl">
                  {{project.title}} - [素材: {{project.itemsCount}}]
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
              <time datetime="">创建: {{project.creatFormatted}}</time>
              <time datetime="">更新: {{project.updateFormatted}}</time>
            </div>
            <footer class="card-footer">
              <a href="javascript:void(0)" class="card-footer-item" :value='project'
                 @click.prevent="save(index)">保存</a>
              <a :href="project.adminUrl" class="card-footer-item">编辑</a>
              <a href="javascript:void(0)" class="card-footer-item has-text-danger"
                 @click.prevent="removeProject(index)">删除</a>
            </footer>
          </div>
        </div>
      </div>
    </paginate>
    <nav class="pagination is-right" role="navigation" aria-label="pagination">
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
  .projects .card, .projects #add-button {
    margin: 40px;
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
    margin: 80px 40px 0 ;
  }
  time {
    display: block;
    font-size: 0.5rem;
  }
</style>
<script>
  import axios from '~/plugins/axios'

  export default {
    async asyncData ({params}) {
      let {data} = await axios.get('/api/project')
      return {projects: data}
    },
    data: function () {
      return {
        paginate: ['projects']
      }
    },
    methods: {
      save: async function (index) {
        try {
          let project = this.projects[index]
          let {data} = await axios.post(project.url_update, {
            title: project.title
          })
          console.log(data.message)
        } catch (err) {
          console.log(err)
        }
      },
      addProject: async function () {
        try {
          let {data} = await axios.post('/api/project/create', {})
          this.projects.splice(0, 0, data)
        } catch (err) {
          console.log(err)
        }
      },
      removeProject: async function (index) {
        try {
          let project = this.projects[index]
          let {data} = await axios.post(project.url_delete)
          if (data.success) {
            this.projects.splice(index, 1)
          }
        } catch (err) {
          console.log(err)
        }
      }
    }
  }
</script>