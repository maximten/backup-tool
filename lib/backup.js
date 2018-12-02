const fs = require('fs')
const path = require('path')
const os = require('os')
const chalk = require('chalk')
const tar = require('tar')
const moment = require('moment')
const mysqldump = require('mysqldump')
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

const formTarName = (srcPath, params) => {
  let { filename, datetimeFormat } = params
  if (filename) {
    let datetime = moment().format(datetimeFormat || 'DD.MM.YYYY')
    filename = filename.replace(/\${datetime}/, datetime)
    return filename
  } else {
    return `${path.basename(srcPath)}.tar.gz`
  }
}

const remoteDirectoryArchivation = async (params) => {
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
  const tarName = formTarName(remotePath, params)
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

const localDirectoryArchivation = async (params) => {
  const { 
    src, 
    dest,
  } = params

  const destPath = path.resolve(dest)
  const srcPath = path.resolve(src)
  const tarName = formTarName(srcPath, params)
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

const databaseArchivation = async (params) => {
  const {
    dest, 
    host,
    port,
    user,
    password,
    database
  } = params
  
  const destPath = path.resolve(dest)
  const dumpName = database + '.sql'
  const dumpPath = `${destPath}/${dumpName}`

  try {
    await mkdir(destPath)
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
      console.error(chalk.red(e.message))
    })
  } catch (e) {
    console.error(chalk.red(e.message))
  }
}

const databaseArchivationOverSsh = async (params) => {
  const { 
    host, 
    dest,
    sshPort,
    user,
    password, 
    database
  } = params
  let {
    privateKey,
    privateKeyPath
  } = params

  const [ fullMatch, username, sshHost, remotePath ] = host.match(/(.*)@(.*)/)
  const port = sshPort || 22
  if (!privateKey) {
    privateKeyPath = path.resolve( privateKeyPath || `${os.homedir()}/.ssh/id_rsa` )
    privateKey = fs.readFileSync(privateKeyPath)
  }
  
  const destPath = path.resolve(dest)
  const dumpName = database + '.sql'
  const dumpPath = `${destPath}/${dumpName}`
  const dumpCommand = `mysqldump -u${user} -p'${password}' ${database} > ${dumpName}` 
  const cleanupCommand = `rm ${dumpName}` 
  
  try {
    await mkdir(destPath)
  } catch (e) {
    console.error(chalk.red(e.message))
  }
  try {
    const conn = await connect({
      host: sshHost,
      port,
      username,
      // password,
      privateKey
    })
    await exec(conn, dumpCommand)
    console.log(chalk.green(`${dumpName} has been created`))
    await copyFromRemote(conn, dumpName, dumpPath)
    console.log(chalk.green(`${dumpName} has been copied to ${dumpPath}`))
    await exec(conn, cleanupCommand)
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

const backup = (config) => {
  Object.entries(config.targets).forEach(([name, params]) => {
    const { 
      src, 
      type, 
      host
    } = params

    if (type === 'directory') {
      const isRemote = src.match(/.*@.*:.*/) !== null
      if (isRemote) {
        remoteDirectoryArchivation(params)
      } else {
        localDirectoryArchivation(params)
      }
    } else if (type === 'database') {
      const connectViaSsh = host.match(/.*@.*/) !== null
      if (connectViaSsh) {
        databaseArchivationOverSsh(params)
      } else {
        databaseArchivation(params)
      }
    }
  })
}

module.exports = backup