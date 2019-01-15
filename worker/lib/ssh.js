const ssh = require('ssh2')
const { Client } = ssh 

const connect = (params) => (
  new Promise((resolve, reject) => {
    const conn = new Client()
    conn
    .on('ready', () => resolve(conn))
    .on('error', (e) => reject(e))
    .connect(params)
  })
)

const exec = (conn, command) => (
  new Promise((resolve, reject) => {
    conn.exec(command, (e, stream) => {
      if (e) {
        reject(e)
      } else {
        let stdout = ''
        let stderr = ''
        stream
        .on('data', (data) => {
          stdout = stdout + data.toString()
        })
        .on('close', (code) => {
          if (code === 0) {
            resolve({ conn, stdout })
          } else {
            reject(stderr)
          }
        })
        .stderr
        .on('data', (data) => {
          stderr = stderr + data.toString()
        })
      }
    })
  })
)

const copyFromRemote = (conn, remotePath, localPath) => (
  new Promise((resolve, reject) => {
    conn.sftp((e, sftp) => {
      if (e) {
        reject(e)
      } else {
        sftp.fastGet(remotePath, localPath, (e) => {
          if (e) {
            reject(e)
          } else {
            resolve({ conn })
          }
        })
      }
    })
  })
)

module.exports = {
  connect,
  exec,
  copyFromRemote
}