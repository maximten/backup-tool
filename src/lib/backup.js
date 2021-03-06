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

const formDumpName = (database, params) => {
  let { filename, datetimeFormat } = params
  if (filename) {
    let datetime = moment().format(datetimeFormat || 'DD.MM.YYYY')
    filename = filename.replace(/\${datetime}/, datetime)
    return filename
  } else {
    return `${database}.sql`
  }
}

const remoteDirectoryArchivation = async (params) => {
  const {
    logger, 
    src, 
    dest,
    ssh,
  } = params

  port = (ssh && ssh.port) || 22
  privateKeyPath = path.resolve((ssh && ssh.privateKeyPath) || `${os.homedir()}/.ssh/id_rsa` )

  const [ fullMatch, username, host, remotePath ] = src.match(/(.*)@(.*):(.*)/)
  const privateKey = fs.existsSync(privateKeyPath) && fs.readFileSync(privateKeyPath)
  
  const destPath = path.resolve(dest)
  const tarName = formTarName(remotePath, params)
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
    await mkdir(destPath)
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

const databaseArchivation = async (params) => {
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
  const dumpName = formDumpName(database, params)
  const dumpPath = `${destPath}/${dumpName}`

  try {
    await mkdir(destPath)
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

const databaseArchivationOverSsh = async (params) => {
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
  const dumpName = formDumpName(mysqlDatabase, params)
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
    await mkdir(destPath)
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

const commandConstructor = (params) => {
  const { type } = params
  if (type === 'directory') {
    const { src } = params
    const isRemote = src.match(/.*@.*:.*/) !== null
    if (isRemote) {
      return remoteDirectoryArchivation
    } else {
      return localDirectoryArchivation
    }
  } else if (type === 'mysql') {
    const { host } = params
    const connectViaSsh = host.match(/.*@.*/) !== null
    if (connectViaSsh) {
      return databaseArchivationOverSsh
    } else {
      return databaseArchivation
    }
  }
}

const backup = async (config) => {
  const { targets, sequential } = config

  const promises = []

  for (const target of Object.entries(targets)) {
    const [targetName, params] = target
    const logger = new Logger(targetName)
    const fullParams = { targetName, logger, ...params }

    const command = commandConstructor(params)

    if (sequential) {
      await command(fullParams)
    } else {
      promises.push(command(fullParams))
    }
  }

  if (sequential) {
    return true
  } else {
    return Promise.all(promises)
  }
}

module.exports = backup