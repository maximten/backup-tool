const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

class JobsListConfigFileReader {
  constructor(file) {
    this.file = file
  }
  getConfig() {
    const filePath = path.resolve(this.file)
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.safeLoad(content)
  }
}

module.exports = JobsListConfigFileReader 