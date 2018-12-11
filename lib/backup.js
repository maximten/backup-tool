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
  const archiveCommand = `tar -C ${remotePath} -czf ${tarName} .` 
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
    console.log(e)
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
    logger.success(`creating ${tarPath}...`)
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
      logger.error(e.message)
    })
    logger.success(`${dumpPath} dump has been created`)
  } catch (e) {
    logger.error(e.message)
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

  const sshPort = ssh.port || 22
  const sshPassword = ssh.password
  const privateKeyPath = ssh.privateKeyPath || `${os.homedir()}/.ssh/id_rsa`

  const mysqlUser = mysql.user || 'root'
  const mysqlPort = mysql.port || 3306
  const mysqlDatabase = mysql.database

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
    const { type } = params
    const logger = new Logger(targetName)
    const fullParams = { targetName, logger, ...params }

    if (type === 'directory') {
      const { src } = params
      const isRemote = src.match(/.*@.*:.*/) !== null
      if (isRemote) {
        remoteDirectoryArchivation(fullParams)
      } else {
        localDirectoryArchivation(fullParams)
      }
    } else if (type === 'mysql') {
      const { host } = params
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