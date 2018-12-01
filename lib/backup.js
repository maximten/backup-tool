const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const tar = require('tar')

const mkdir = (path) => (
  new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
)

const backup = (config) => {
  Object.entries(config.targets).forEach(([name, params]) => {
    const { src, dest } = params
    const srcPath = path.resolve(src)
    const destPath = path.resolve(dest)
    const tarName = `${path.basename(srcPath)}.tar.gz`
    const tarPath = `${destPath}/${tarName}`
    mkdir(destPath)
    .then(() => {
      console.log(chalk.green(`${destPath} path has been created`))
      return tar.create({ 
        cwd: srcPath,
        file: tarPath,
        gzip: true, 
      }, ['.'])
    })
    .then(() => {
      console.log(chalk.green(`${destPath}/${tarName} archive has been created`))
    })
    .catch((e) => console.error(chalk.red(e.message)))
  })
}

module.exports = backup