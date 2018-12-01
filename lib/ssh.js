const ssh = require('ssh2')
const { Client } = ssh 

const connect = (params) => (
  new Promise((resolve, reject) => {
    const conn = new Client()
    conn
    .on('ready', () => resolve(conn))
    .on('error', (err) => reject({ conn, err }))
    .connect(params)
  })
)

const exec = (conn, command) => (
  new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject({ conn, err })
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
            reject({ conn, err: stderr })
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
    conn.sftp((err, sftp) => {
      if (err) {
        reject({ conn, err })
      } else {
        sftp.fastGet(remotePath, localPath, (err) => {
          if (err) {
            reject({ conn, err })
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