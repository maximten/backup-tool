const yargs = require('yargs')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const yaml = require('js-yaml')
const validate = require('./lib/validate')
const backup = require('./lib/backup')
const cron = require('node-cron')

const argv = yargs.help('help')
  .usage('Usage: node $0')
  .version('0.0.1')
  .option('file', {
    alias: 'f',
    description: 'Specify config file',
    string: true,
    default: 'backup-config.yml'
  })
  .alias('help', 'h')
  .alias('version', 'v')
  .argv

let config = null
try {
  const { file } = argv
  const filePath = path.resolve(file)
  const content = fs.readFileSync(filePath, 'utf8')
  config = yaml.safeLoad(content)
} catch (e) {
  console.error(chalk.red(e.message))
  process.exit(1)
}

try {
  validate(config)
} catch (e) {
  console.error(chalk.red(e.message))
  process.exit(1)
}

try {
  if (config.cron) {
    cron.schedule(config.cron, () => {
      backup(config)
    })
  } else {
    backup(config)
  }
} catch (e) {
  console.error(chalk.red(e.message))
}