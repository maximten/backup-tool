const fs = require('fs')
const path = require('path')
const os = require('os')
const tar = require('tar')
const moment = require('moment')
const mysqldump = require('mysqldump')
const { connect, exec, copyFromRemote } = require('./ssh') 
const { Logger } = require('./log')

const mkdir = (path) => (
  new Promise((resolve, reject) => {
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
    logger, 
    src, 
    dest,
  } = params
  let {
    ssh: {
      port,
      password,
      privateKeyPath  
    }
  } = params

  port = port || 22
  privateKeyPath = path.resolve( privateKeyPath || `${os.homedir()}/.ssh/id_rsa` )

  const [ fullMatch, username, host, remotePath ] = src.match(/(.*)@(.*):(.*)/)
  const privateKey = fs.readFileSync(privateKeyPath)
  
  const destPath = path.resolve(dest)
  const tarName = formTarName(remotePath, params)
  const tarPath = `${destPath}/${tarName}`
  const remoteTarPath = `${remotePath}/${tarName}`
  const fullRemoteTarPath = `${host}:${remotePath}/${tarName}`
  const archiveCommand = `cd ${remotePath} && tar -czf ${tarName} .` 
  const cleanupCommand = `rm ${remoteTarPath}` 
  
  let conn = null
  try {
    conn = await connect({
      host,
      port,
      username,
      password,
      privateKey
    })
    await exec(conn, archiveCommand)
    logger.success(`${fullRemoteTarPath} has been created`)
    await mkdir(destPath)
    await copyFromRemote(conn, remoteTarPath, tarPath)
    logger.success(`${fullRemoteTarPath} has been copied to ${tarPath}`)
    await exec(conn, cleanupCommand)
    logger.success(`${fullRemoteTarPath} has been removed`)
    conn.end()
  } catch (e) {
    logger.error(e.message)
    conn && conn.end() 
  }
}

const localDirectoryArchivation = async (params) => {
  const { 
    logger,
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
    logger.success(`${destPath}/${tarName} archive has been created`)
  } catch (e) {
    logger.error(e.message)
  }
}

const databaseArchivation = async (params) => {
  const {
    logger,
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
      logger.error(e.message)
    })
  } catch (e) {
    logger.error(e.message)
  }
}

const databaseArchivationOverSsh = async (params) => {
  const { 
    logger,
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

  let conn = null
  try {
    conn = await connect({
      host: sshHost,
      port,
      username,
      // password,
      privateKey
    })
    await exec(conn, dumpCommand)
    logger.success(`${dumpName} has been created`)
    await mkdir(destPath)
    await copyFromRemote(conn, dumpName, dumpPath)
    logger.success(`${dumpName} has been copied to ${dumpPath}`)
    await exec(conn, cleanupCommand)
    conn.end()
  } catch (e) {
    logger.error(e.message)
    conn && conn.end()
  }
}

const backup = (config) => {
  Object.entries(config.targets).forEach(([targetName, params]) => {
    const { 
      src, 
      type, 
      host
    } = params
    const logger = new Logger(targetName)
    const fullParams = { targetName, logger, ...params }

    if (type === 'directory') {
      const isRemote = src.match(/.*@.*:.*/) !== null
      if (isRemote) {
        remoteDirectoryArchivation(fullParams)
      } else {
        localDirectoryArchivation(fullParams)
      }
    } else if (type === 'database') {
      const connectViaSsh = host.match(/.*@.*/) !== null
      if (connectViaSsh) {
        databaseArchivationOverSsh(fullParams)
      } else {
        databaseArchivation(fullParams)
      }
    }
  })
}

module.exports = backup