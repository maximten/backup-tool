const path = require('path')
const moment = require('moment')
const Archivation = require('./Archivation')

class DirectoryArchivation extends Archivation {
  formTarName(srcPath, params) {
    let { filename, datetimeFormat } = params
    if (filename) {
      let datetime = moment().format(datetimeFormat || 'DD.MM.YYYY')
      filename = filename.replace(/\${datetime}/, datetime)
      return filename
    } else {
      return `${path.basename(srcPath)}.tar.gz`
    }
  }
}

module.exports = DirectoryArchivation