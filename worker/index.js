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
  .option('sequential', {
    alias: 's',
    description: 'Turn on sequential order of execution',
    boolean: true,
    default: false,
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

class Queue {
  constructor() {
    this.queue = []
    this.isJobRunning = false
  }
  run() {
    if (!this.isJobRunning) {
      this.isJobRunning = true
      const job = this.queue.pop()
      job().then(() => {
        this.isJobRunning = false
        this.run()
      })
    }
  }
  push(job) {
    this.queue.push(job)
  }
}

try {
  const { sequential } = argv
  if (config.cron) {
    const queue = new Queue()
    cron.schedule(config.cron, () => {
      queue.push(() => (
        backup({
          ...config,
          sequential
        })
      ))
      queue.run()
    })
  } else {
    backup({
      ...config,
      sequential
    })
  }
} catch (e) {
  console.error(chalk.red(e.message))
}