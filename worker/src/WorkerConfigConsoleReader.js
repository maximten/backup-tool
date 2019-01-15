const yargs = require('yargs')

class WorkerConfigConsoleReader {
  constructor() {
    this.instanse = yargs.help('help')
    .usage('Usage: node $0')
    .version('0.0.1')
    .option('file', {
      alias: 'f',
      description: 'Specify config file',
      string: true,
      default: 'backup-config.yml'
    })
    .option('sequential', {
      alias: 's',
      description: 'Turn on sequential order of execution',
      boolean: true,
      default: false,
    })
    .alias('help', 'h')
    .alias('version', 'v')
  }
  getConfig() {
    return this.instanse.argv
  }
}

module.exports = WorkerConfigConsoleReader 