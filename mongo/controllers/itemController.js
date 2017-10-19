const Item = require('../models/item')
// const Project = require('../models/project')
const mongoose = require('mongoose')
const path = require('path')
const del = require('del')

// Count Item
// let itemCount = async (project_id) => {
//   let count = await Item.count({project: project_id})
// }
// Create new Item
let itemCreatePost = async (req, res, next) => {
  // if (!req.files && !req.body.url) {
  //   return res.send({success: false, message: 'No file or iframe url!'})
  // }
  try {
    console.log(req.body)
    let item = new Item()
    if (req.files && req.files.file) {
      let file = req.files.file
      let fileName = `${item._id}.${file.name.split('.').pop()}`
      await file.mv(path.resolve(__dirname, '../../static/uploads', fileName))
      item.file = {
        name: fileName,
        mimetype: file.mimetype
      }
    }
    if (req.body.url) {
      item.url = req.body.url
    }
    item.type = req.body.type
    item.startTime = req.body.startTime
    item.endTime = req.body.endTime
    item.x = req.body.x
    item.y = req.body.y
    item.width = req.body.width
    item.height = req.body.height
    item.zIndex = req.body.zIndex
    item.project = mongoose.mongo.ObjectId(req.body.project_id)
    let result = await item.save()
    res.send({success: true, message: `item: ${item._id} has been created`, data: result})
  } catch (err) {
    next(err)
  }
}

let itemDeletePost = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id)
    let mes = ''
    await item.remove()
    mes += `item: ${req.params.id} has been removed!`
    res.send({success: true, message: mes})
  } catch (err) {
    next(err)
  }
}

let itemUpdatePost = async (req, res, next) => {
  try {
    let mes = ''
    let updateObj = {}
    let item = await Item.findById(req.params.id)
    if (item._id) {
      if (req.body.fileChanged === 'true') {
        if (item.file.name) {
          try {
            await del([path.resolve(__dirname, '../../static/uploads', item.file.name)])
            mes += `file: ${item.file.name} has been removed!`
            updateObj.file = {}
          } catch (err) {
            next(err)
          }
        }
        if (req.files && req.files.file) {
          let file = req.files.file
          let fileName = `${item._id}.${file.name.split('.').pop()}`
          await file.mv(path.resolve(__dirname, '../../static/uploads', fileName))
          mes += `file: ${fileName} has been uploaded! `
          updateObj.file = {
            name: fileName,
            mimetype: file.mimetype
          }
        }
      }
      if (req.body.url) {
        item.url = req.body.url
      }
      item.type = req.body.type
      updateObj.startTime = req.body.startTime
      updateObj.endTime = req.body.endTime
      updateObj.x = req.body.x
      updateObj.y = req.body.y
      updateObj.width = req.body.width
      updateObj.height = req.body.height
      updateObj.zIndex = req.body.zIndex
      updateObj.project = mongoose.mongo.ObjectId(req.body.project_id)
      await item.update({$set: updateObj})
      mes += `item: ${req.params.id} has been updated!`
      res.send({success: true, message: mes})
    }
  } catch (err) {
    next(err)
  }
}

export default {
  itemCreatePost,
  itemDeletePost,
  itemUpdatePost
}
