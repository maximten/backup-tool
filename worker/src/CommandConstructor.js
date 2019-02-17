const RemoteDirectoryArchivation = require('./RemoteDirectoryArchivation')
const LocalDirectoryArchivation = require('./LocalDirectoryArchivation')
const DatabaseArchivationOverSsh = require('./DatabaseArchivationOverSsh')
const LocalDatabaseArchivation = require('./LocalDatabaseArchivation')

class CommandConstructor {
  constructCommand(params) {
    const { type } = params
    if (type === 'directory') {
      const { src } = params
      const isRemote = src.match(/.*@.*:.*/) !== null
      if (isRemote) {
        return new RemoteDirectoryArchivation()
      } else {
        return new LocalDirectoryArchivation()
      }
    } else if (type === 'mysql') {
      const { host } = params
      const connectViaSsh = host.match(/.*@.*/) !== null
      if (connectViaSsh) {
        return new DatabaseArchivationOverSsh()
      } else {
        return new LocalDatabaseArchivation()
      }
    }
  }
}
  
module.exports = CommandConstructor