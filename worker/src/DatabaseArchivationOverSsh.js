const fs = require('fs')
const path = require('path')
const os = require('os')
const { connect, exec, copyFromRemote } = require('../lib/ssh') 
const DatabaseArchivation = require('./DatabaseArchivation')

class DatabaseArchivationOverSsh extends DatabaseArchivation {
  async execute(params) {
    const { 
      logger,
      host, 
      dest,
      ssh,
      mysql
    } = params
  
    const sshPort = (ssh && ssh.port) || 22
    const sshPassword = (ssh && ssh.password) || ''
    const privateKeyPath = (ssh && ssh.privateKeyPath) || `${os.homedir()}/.ssh/id_rsa`
  
    const mysqlUser = (mysql && mysql.user) || 'root'
    const mysqlPort = (mysql && mysql.port) || 3306
    const mysqlDatabase = (mysql && mysql.database)
  
    const [ fullMatch, sshUsername, sshHost ] = host.match(/(.*)@(.*)/)
    const privateKey = fs.readFileSync(privateKeyPath)
    
    const destPath = path.resolve(dest)
    const dumpName = this.formDumpName(mysqlDatabase, params)
    const dumpPath = `${destPath}/${dumpName}`
    const dumpCommand = `mysqldump -u${mysqlUser} -p'${mysql.password}' -P ${mysqlPort} ${mysqlDatabase} > ${dumpName}` 
    const cleanupCommand = `rm ${dumpName}` 
  
    let conn = null
    try {
      conn = await connect({
        host: sshHost,
        port: sshPort,
        username: sshUsername,
        password: sshPassword,
        privateKey 
      })
      await exec(conn, dumpCommand)
      logger.success(`${dumpName} has been created`)
      await this.mkdir(destPath)
      logger.info(`loading ${dumpName} ...`)
      await copyFromRemote(conn, dumpName, dumpPath)
      logger.success(`${dumpName} has been copied to ${dumpPath}`)
      await exec(conn, cleanupCommand)
      logger.success(`${dumpName} has been removed`)
      conn.end()
    } catch (e) {
      logger.error(e.message || e)
      conn && conn.end()
    }
  }
}

module.exports = DatabaseArchivationOverSsh