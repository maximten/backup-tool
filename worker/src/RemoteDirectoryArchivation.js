const fs = require('fs')
const path = require('path')
const os = require('os')
const { connect, exec, copyFromRemote } = require('../lib/ssh') 
const DirectoryArchivation = require('./DirectoryArchivation')

class RemoteDirectoryArchivation extends DirectoryArchivation {
  async execute(params) {
    const {
      logger, 
      src, 
      dest,
      ssh,
    } = params

    const port = (ssh && ssh.port) || 22
    const privateKeyPath = path.resolve((ssh && ssh.privateKeyPath) || `${os.homedir()}/.ssh/id_rsa` )
  
    const [ fullMatch, username, host, remotePath ] = src.match(/(.*)@(.*):(.*)/)
    const privateKey = fs.existsSync(privateKeyPath) && fs.readFileSync(privateKeyPath)
    
    const destPath = path.resolve(dest)
    const tarName = this.formTarName(remotePath, params)
    const tarPath = `${destPath}/${tarName}`
    const remoteTarPath = `${tarName}`
    const fullRemoteTarPath = `${host}:${remoteTarPath}`
    const archiveCommand = `tar -C ${remotePath} -czf ${tarName} .` 
    const cleanupCommand = `rm ${remoteTarPath}` 
    
    let conn = null
    try {
      conn = await connect({
        host,
        port,
        username,
        password: (ssh && ssh.password) || '',
        privateKey
      })
      logger.success(`successfully connected to ${host} as ${username}`)
      logger.info(`creating ${fullRemoteTarPath} ...`)
      await exec(conn, archiveCommand)
      logger.success(`${fullRemoteTarPath} has been created`)
      await this.mkdir(destPath)
      logger.info(`loading ${tarName} ...`)
      await copyFromRemote(conn, remoteTarPath, tarPath)
      logger.success(`${fullRemoteTarPath} has been copied to ${tarPath}`)
      await exec(conn, cleanupCommand)
      logger.success(`${fullRemoteTarPath} has been removed`)
      conn.end()
    } catch (e) {
      logger.error(e.message || e)
      conn && conn.end() 
    }
  }
}

module.exports = RemoteDirectoryArchivation