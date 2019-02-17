const fs = require('fs')
const Command = require('./Command') 

class Archivation extends Command {
  mkdir(path) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(path)) {
        fs.mkdir(path, { recursive: true }, (e) => {
          if (e) {
            reject(e)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }
}

module.exports = Archivation