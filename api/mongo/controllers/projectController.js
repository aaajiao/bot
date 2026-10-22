const Project = require('../models/project')
const Item = require('../models/item')

// Return list of all Projects
let projectList = async (req, res, next) => {
  try {
    const projects = await Project.find({}).lean({ virtuals: true })
    for (let p of projects) {
      p.itemsCount = await Item.countDocuments({ project: p._id })
    }
    res.send(projects)
  } catch (err) {
    next(err)
  }
}

// Return Project detail
let projectDetail = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
    const items = await Item.find({ project: req.params.id }).sort({ zIndex: -1 })
    res.send({
      items,
      color: project.color,
      width: project.width,
      height: project.height,
      endTime: project.endTime,
      link: project.link
    })
  } catch (err) {
    next(err)
  }
}

// Create new Project
let projectCreatePost = async (req, res, next) => {
  try {
    let project = await Project.create({
      title: req.body.title || 'untitled',
      color: req.body.color || '#FFFFFF',
      width: req.body.width || 1920,
      height: req.body.height || 1080,
      endTime: req.body.endTime || 1000,
      link: req.body.link || '',
      date_of_create: req.body.date_of_create || Date.now(),
      date_of_update: req.body.date_of_update || Date.now()
    })
    res.send(project)
  } catch (err) {
    next(err)
  }
}

// Delete Specific Porject
let projectDeletePost = async (req, res, next) => {
  try {
    await Item.deleteOne({ project: req.params.id })
    await Project.deleteOne({ _id: req.params.id })
    res.send({ success: true, message: `project: ${req.params.id} has beed removed!` })
  } catch (err) {
    next(err)
  }
}

// Update Specific Project
let projectUpdatePost = async (req, res, next) => {
  try {
    // let d = req.body
    await Project.findByIdAndUpdate(req.params.id, {
      title: req.body.title || 'untitled',
      color: req.body.color || '#FFFFFF',
      width: req.body.width || 1920,
      height: req.body.height || 1080,
      endTime: req.body.endTime || 1000,
      link: req.body.link || '',
      date_of_create: req.body.date_of_create || Date.now(),
      date_of_update: req.body.date_of_update || Date.now()
      // items: item
    })
    res.send({ success: true, message: `project: ${req.params.id} has been updated!` })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  projectList,
  projectDetail,
  projectCreatePost,
  projectDeletePost,
  projectUpdatePost
}
