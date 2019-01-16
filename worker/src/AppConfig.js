const yargs = require('yargs')

class AppConfig {
  constructor() {
    this.config = this.readConfigFromArgv()
  }
  readConfigFromArgv() {
    return yargs.help('help')
    .usage('Usage: node $0')
    .version('0.0.1')
    .option('file', {
      alias: 'f',
      description: 'Specify config file',
      string: true,
      default: 'backup-config.yml'
    })
    .option('server', {
      alias: 's',
      description: 'Run in server mode',
      boolean: true,
      default: false
    })
    .alias('help', 'h')
    .alias('version', 'v')
    .argv
  }
  isSever() {
    return this.config.server
  }
  isStandalone() {
    return !this.config.server
  }
  getJobsListConfigFile() {
    return this.config.file
  }
}

module.exports = AppConfig 