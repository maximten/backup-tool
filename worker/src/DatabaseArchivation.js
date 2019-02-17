const moment = require('moment')
const Archivation = require('./Archivation')

class DatabaseArchivation extends Archivation {
  formDumpName(database, params) {
    let { filename, datetimeFormat } = params
    if (filename) {
      let datetime = moment().format(datetimeFormat || 'DD.MM.YYYY')
      filename = filename.replace(/\${datetime}/, datetime)
      return filename
    } else {
      return `${database}.sql`
    }
  }
}
  
module.exports = DatabaseArchivation