const mongoose             = require('mongoose')
const mongooseLeanVirtuals = require('mongoose-lean-virtuals')
const Schema               = mongoose.Schema
const moment               = require('moment')

const ProjectSchema = Schema({
                               title: {
                                 type: String,
                                 required: true,
                                 max: 100
                               },
                               color: {
                                 type: String,
                                 required: true
                               },
                               width: {
                                 type: Number,
                                 required: true,
                                 default: 1920
                               },
                               height: {
                                 type: Number,
                                 required: true,
                                 default: 1080
                               },
                               endTime: {
                                 type: Number,
                                 min: 0,
                                 required: true,
                                 default: 0
                               },
                               link: {
                                 type: String
                               },
                               date_of_create: {
                                 type: Date,
                                 default: Date.now()
                               },
                               date_of_update: {
                                 type: Date,
                                 default: Date.now()
                               }
                               // author: {
                               //   type: Schema.ObjectId,
                               //   ref: 'User',
                               //   required: true
                               // },
                               // items: [{
                               //   type: Schema.ObjectId,
                               //   ref: 'Item'
                               // }]
                             })

ProjectSchema
  .virtual('creatFormatted')
  .get(function () {
    return moment(this.date_of_create).format('YYYY/MM/DD HH:mm')
  })

ProjectSchema
  .virtual('updateFormatted')
  .get(function () {
    return moment(this.date_of_update).format('YYYY/MM/DD HH:mm')
  })

ProjectSchema
  .virtual('url')
  .get(function () {
    return '/' + this._id
  })

ProjectSchema
  .virtual('adminUrl')
  .get(function () {
    return '/admin/' + this._id
  })

ProjectSchema
  .virtual('url_create')
  .get(function () {
    return '/api/project/create'
  })

ProjectSchema
  .virtual('url_delete')
  .get(function () {
    return '/api/project/delete/' + this._id
  })

ProjectSchema
  .virtual('url_update')
  .get(function () {
    return '/api/project/update/' + this._id
  })

ProjectSchema.pre('remove', async (next) => {
  const Item = mongoose.model('Item')
  const resp = await Item.deleteMany({ project: this._id })
  next(resp)
})
ProjectSchema.plugin(mongooseLeanVirtuals)
ProjectSchema.set('toJSON', { virtuals: true })
module.exports = mongoose.model('Project', ProjectSchema)
