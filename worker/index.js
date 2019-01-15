const chalk = require('chalk')
const backup = require('./lib/backup')
const cron = require('node-cron')
const WorkerConfigConsoleReader = require('./src/WorkerConfigConsoleReader')
const JobQueue = require('./src/JobQueue')
const JobsListConfigFileReader = require('./src/JobsListConfigFileReader')
const JobsListConfigValidator = require('./src/JobsListConfigValidator')

const WorkerConfigConsoleReaderInst = new WorkerConfigConsoleReader()
const workerConfig = WorkerConfigConsoleReaderInst.getConfig()
const JobsListConfigFileReaderInst = new JobsListConfigFileReader(workerConfig.file)
const jobsListConfig = JobsListConfigFileReaderInst.getConfig()
const JobsListConfigValidatorInst = new JobsListConfigValidator()
JobsListConfigValidatorInst.validate(jobsListConfig)

try {
  const { sequential } = jobsListConfig
  if (jobsListConfig.cron) {
    const queue = new JobQueue()
    cron.schedule(jobsListConfig.cron, () => {
      queue.push(() => (
        backup({
          ...jobsListConfig,
          sequential
        })
      ))
      queue.run()
    })
  } else {
    backup({
      ...jobsListConfig,
      sequential
    })
  }
} catch (e) {
  console.error(chalk.red(e.message))
}