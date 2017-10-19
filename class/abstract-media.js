class AbstractMedia {
  constructor (options) {
    this.id = options.id
    this.type = options.type || 'image'
    this.startTime = options.startTime || 0
    this.endTime = options.endTime || -1
    this.pos = options.pos || {x: 100, y: 100}
    this.size = options.size || {x: 100, y: 100}
    this.url = options.url || ''
  }

  play () {
    setTimeout(() => {
      console.log(`${this.url} - show`)
    }, this.startTime)
    setTimeout(() => {
      console.log(`${this.url} - hide`)
    }, this.endTime)
  }
}

export default AbstractMedia
