const path = require('path')
const mysqldump = require('mysqldump')
const DatabaseArchivation = require('./DatabaseArchivation')

class LocalDatabaseArchivation extends DatabaseArchivation {
  async execute(params) {
    const {
      logger,
      dest, 
    } = params
    let {
      mysql: {
        host,
        port,
        user,
        password,
        database
      }
    } = params
  
    host = host || '127.0.0.1'
    port = port || 3306
    user = user || 'root'
    
    const destPath = path.resolve(dest)
    const dumpName = this.formDumpName(database, params)
    const dumpPath = `${destPath}/${dumpName}`
  
    try {
      await this.mkdir(destPath)
      logger.success(`creating ${dumpPath}...`)
      mysqldump({
        connection: {
          host,
          port,
          user,
          password,
          database
        },
        dumpToFile: dumpPath
      }).catch((e) => {
        logger.error(e.message || e)
      })
      logger.success(`${dumpPath} dump has been created`)
    } catch (e) {
      logger.error(e.message || e)
    }
  }
}

module.exports = LocalDatabaseArchivation