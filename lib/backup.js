const fs = require('fs')
const path = require('path')
const os = require('os')
const chalk = require('chalk')
const tar = require('tar')
const { connect, exec, copyFromRemote } = require('./ssh') 

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

const remoteArchivation = async (params) => {
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

  const [ fullMatch, username, host, remotePath ] = src.match(/(.*)@(.*):(.*)/)
  const port = sshPort || 22
  if (!privateKey) {
    privateKeyPath = path.resolve( privateKeyPath || `${os.homedir()}/.ssh/id_rsa` )
    privateKey = fs.readFileSync(privateKeyPath)
  }
  
  const destPath = path.resolve(dest)
  const tarName = `${path.basename(remotePath)}.tar.gz`
  const tarPath = `${destPath}/${tarName}`
  const remoteTarPath = `${remotePath}/${tarName}`
  const fullRemoteTarPath = `${host}:${remotePath}/${tarName}`
  const archiveCommand = `cd ${remotePath} && tar -czf ${tarName} .` 
  const cleanupCommand = `rm ${remoteTarPath}` 
  
  try {
    await mkdir(destPath)
  } catch (e) {
    console.error(chalk.red(e.message))
  }
  try {
    const conn = await connect({
      host,
      port,
      username,
      password,
      privateKey
    })
    await exec(conn, archiveCommand)
    console.log(chalk.green(`${fullRemoteTarPath} has been created`))
    await copyFromRemote(conn, remoteTarPath, tarPath)
    console.log(chalk.green(`${fullRemoteTarPath} has been copied to ${tarPath}`))
    await exec(conn, cleanupCommand)
    console.log(chalk.green(`${fullRemoteTarPath} has been removed`))
    conn.end()
  } catch ({ conn, err }) {
    if (err) {
      const message = err.message ? err.message : err 
      console.error(chalk.red(message))
    }
    if (conn) {
      conn.end()
    }
  }
}

const localArchivation = async (params) => {
  const { 
    src, 
    dest,
  } = params

  const destPath = path.resolve(dest)
  const srcPath = path.resolve(src)
  const tarName = `${path.basename(srcPath)}.tar.gz`
  const tarPath = `${destPath}/${tarName}`

  try {
    await mkdir(destPath)
    await tar.create({ 
      cwd: srcPath,
      file: tarPath,
      gzip: true, 
    }, ['.'])
    console.log(chalk.green(`${destPath}/${tarName} archive has been created`))
  } catch (e) {
    console.error(chalk.red(e.message))
  }
}

const backup = (config) => {
  Object.entries(config.targets).forEach(([name, params]) => {
    const { 
      src, 
      dest,
    } = params

    const isRemote = src.match(/.*@.*:.*/) !== null
    if (isRemote) {
      remoteArchivation(params)
    } else {
      localArchivation(params)
    }
  })
}

module.exports = backup