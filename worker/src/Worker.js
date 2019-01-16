const cron = require('node-cron')
const backup = require('../lib/backup')
const JobQueue = require('./JobQueue')


class Worker {
  constructor(jobsListConfig) {
    this.jobsListConfig = jobsListConfig
  }
  run() {
    const { sequential } = this.jobsListConfig
    if (this.jobsListConfig.cron) {
      const queue = new JobQueue()
      cron.schedule(this.jobsListConfig.cron, () => {
        queue.push(() => (
          backup({
            ...this.jobsListConfig,
            sequential
          })
        ))
        queue.run()
      })
    } else {
      backup({
        ...this.jobsListConfig,
        sequential
      })
    }
  }
}

module.exports = Worker 