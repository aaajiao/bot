class MediaFactory {
  constructor () {
    this.itemList = []
  }

  loadMediaFromJson () {
    let fakeData = `[ { "id":"_id1", "type": "video", "startTime": 1200, "endTime": 2400, "pos": { "x": 100, "y": 100 }, "size": { "width": 200, "height": 200 }, "url": "/assets/video1.mp4" }, { "id": "_id2", "type": "image", "startTime": 2800, "endTime": 9900, "pos": { "x": 200, "y": 200 }, "size": { "width": 200, "height": 200 }, "url":"/assets/img1.jpg" }, { "id": "_id3", "type": "image", "startTime": 5600, "endTime": 15000, "pos": { "x": 300, "y": 300 }, "size": { "width": 200, "height": 200 }, "url":"/assets/img2.gif" } ]`
    this.jsonObj = JSON.parse(fakeData)
    // console.log(this.jsonObj)
    for (let i in this.jsonObj) {
      let item = this.jsonObj[i]
      if (item.id && item.url) {
        this.addMedia(this.jsonObj[i])
      }
    }
  }

  addMedia (options) {
    switch (options.type) {
      case 'image':
        this.mediaTypeClass = Image
        break
      case 'iframe':
        this.mediaTypeClass = IFrame
        break
      case 'video':
        this.mediaTypeClass = Video
        break
      case 'audio':
        this.mediaTypeClass = Audio
        break
      default:
        this.mediaTypeClass = Image
    }
    let item = new this.mediaTypeClass(options)
    this.itemList.push(item)
  }

  play () {
    for (let item in this.itemList) {
      this.itemList[item].play()
    }
  }

  getMedias () {
    return this.itemList
  }
}

export default MediaFactory
