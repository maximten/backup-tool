const path = require('path')
const tar = require('tar')
const DirectoryArchivation = require('./DirectoryArchivation')

class LocalDirectoryArchivation extends DirectoryArchivation {
  async execute(params) {
    const { 
      logger,
      src, 
      dest,
    } = params
  
    const destPath = path.resolve(dest)
    const srcPath = path.resolve(src)
    const tarName = this.formTarName(srcPath, params)
    const tarPath = `${destPath}/${tarName}`
  
    try {
      await this.mkdir(destPath)
      logger.success(`creating ${tarPath}...`)
      await tar.create({ 
        cwd: srcPath,
        file: tarPath,
        gzip: true, 
      }, ['.'])
      logger.success(`${destPath}/${tarName} archive has been created`)
    } catch (e) {
      logger.error(e.message || e)
    }
  }
}

module.exports = LocalDirectoryArchivation