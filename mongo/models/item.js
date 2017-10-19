const mongoose = require('mongoose')
const Schema = mongoose.Schema
const path = require('path')
const del = require('del')

const ItemSchema = Schema({
  type: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio', 'iframe', 'null'],
    default: 'null'
  },
  file: {
    name: {type: String},
    mimetype: {type: String}
  },
  url: {
    type: String
  },
  startTime: {
    type: Number,
    min: 0,
    required: true
  },
  endTime: {
    type: Number,
    min: 0,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true,
    min: 0
  },
  height: {
    type: Number,
    required: true,
    min: 0
  },
  zIndex: {
    type: Number,
    required: true,
    default: 50
  },
  project: {
    type: Schema.ObjectId,
    ref: 'Project',
    required: true
  }
})

ItemSchema
  .virtual('url_create')
  .get(function () {
    return '/api/item/create'
  })

ItemSchema
  .virtual('url_delete')
  .get(function () {
    return '/api/item/delete/' + this._id
  })

ItemSchema
  .virtual('url_update')
  .get(function () {
    return '/api/item/update/' + this._id
  })

ItemSchema
  .virtual('source')
  .get(function () {
    if (this.type === 'iframe') {
      return this.url
    }
    if (this.file.name) {
      return '/uploads/' + this.file.name
    }
    return null
  })

ItemSchema.pre('remove', function (next) {
  if (this.file && this.file.name) {
    del([path.resolve(__dirname, '../../static/uploads', this.file.name)]).then()
  }
  next()
})

ItemSchema.set('toJSON', {virtuals: true})
module.exports = mongoose.model('Item', ItemSchema)
