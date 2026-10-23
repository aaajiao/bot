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
  // console.log(req.body)
  // console.log(req.files)
  try {
    let item = new Item()
    if (req.files && req.files.file) {
      let file = req.files.file
      if (file) {
        // console.log(file)
        item.file = {
          name: file.filename,
          mimetype: file.mimetype
        }
      }
    }
    if (req.body.link) {
      item.link = req.body.link
    }
    item.TUID = req.body.TUID
    item.type = req.body.type
    item.startTime = req.body.startTime
    item.endTime = req.body.endTime
    item.x = req.body.x
    item.y = req.body.y
    item.width = req.body.width
    item.height = req.body.height
    item.zIndex = req.body.zIndex
    item.project = new mongoose.Types.ObjectId(req.body.project_id)
    let result = await item.save()
    res.json({ success: true, message: `item: ${item._id} has been created`, data: result })
  } catch (err) {
    next(err)
  }
}

let itemDeletePost = async (req, res, next) => {
  try {
    let item = await Item.deleteOne({ _id: req.params.id })
    console.dir(item)
    let mes = `item: ${req.params.id} has been removed!`
    res.send({ success: true, message: mes })
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
            await del([path.resolve(__dirname, '../../../static/uploads', item.file.name)])
            mes += `file: ${item.file.name} has been removed!`
            updateObj.file = {}
          } catch (err) {
            next(err)
          }
        }
        if (req.files && req.files.file) {
          let file = req.files.file
          mes += `file: ${file.filename} has been uploaded! `
          updateObj.file = {
            name: file.filename,
            mimetype: file.mimetype
          }
        }
      }
      if (req.body.link) {
        updateObj.link = req.body.link
      }
      updateObj.TUID = req.body.TUID
      updateObj.type = req.body.type
      updateObj.startTime = req.body.startTime
      updateObj.endTime = req.body.endTime
      updateObj.x = req.body.x
      updateObj.y = req.body.y
      updateObj.width = req.body.width
      updateObj.height = req.body.height
      updateObj.zIndex = req.body.zIndex
      updateObj.project = new mongoose.Types.ObjectId(req.body.project_id)
      // console.log(updateObj)
      await item.updateOne({ $set: updateObj })
      mes += `item: ${req.params.id} has been updated!`
      res.send({ success: true, message: mes })
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}

module.exports = {
  itemCreatePost,
  itemDeletePost,
  itemUpdatePost
}
