const fs = require('fs')
const path = require('path')
const os = require('os')
const chalk = require('chalk')
const tar = require('tar')
const { connect, exec, get } = require('./ssh') 

const mkdir = (path) => (
  new Promise((resolve, reject) => {
    if (!fs.existsSync(path)) {
      fs.mkdir(path, { recursive: true }, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    } else {
      resolve()
    }
  })
)

const backup = (config) => {
  Object.entries(config.targets).forEach(([name, params]) => {
    const { 
      src, 
      dest,
      sshPort,
      password, 
    } = params
    let {
      privateKey,
      privateKeyPath
    } = params

    const destPath = path.resolve(dest)

    const isRemote = src.match(/.*@.*:.*/) !== null
    if (isRemote) {
      const [ fullMatch, username, host, remotePath ] = src.match(/(.*)@(.*):(.*)/)
      const port = sshPort || 22
      if (!privateKey) {
        privateKeyPath = path.resolve( privateKeyPath || `${os.homedir()}/.ssh/id_rsa` )
        privateKey = fs.readFileSync(privateKeyPath)
      }

      const tarName = `${path.basename(remotePath)}.tar.gz`
      const tarPath = `${destPath}/${tarName}`
      const remoteTarPath = `${remotePath}/${tarName}`
      const archiveCommand = `cd ${remotePath} && tar -czf ${tarName} .` 
      const cleanupCommand = `rm ${remoteTarPath}` 
      
      mkdir(destPath)
      .then(() => {
        return connect({
          host,
          port,
          username,
          password,
          privateKey
        })
      }, (e) => {
        console.error(chalk.red(e.message))
      })
      .then(({ conn }) => exec(conn, archiveCommand))
      .then(({ conn, stdout }) => {
        return get(conn, remoteTarPath, tarPath)
      })
      .then(({ conn }) => {
        console.log(chalk.green(`${tarName} has been copied to ${tarPath}`))
        return exec(conn, cleanupCommand)
      })
      .then(({ conn }) => {
        conn.end()
      })
      .catch(({ conn, err }) => {
        if (err) {
          const message = err.message ? err.message : err 
          console.error(chalk.red(message))
        }
        if (conn) {
          conn.end()
        }
      })
    } else {
      const srcPath = path.resolve(src)
      const tarName = `${path.basename(srcPath)}.tar.gz`
      const tarPath = `${destPath}/${tarName}`

      mkdir(destPath)
      .then(() => {
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
    }
  })
}

module.exports = backup