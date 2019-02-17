const cron = require('node-cron')
const JobQueue = require('./JobQueue')
const Job = require('./Job')

class Worker {
  constructor(jobsListConfig) {
    this.jobsListConfig = jobsListConfig
  }
  run() {
    const { sequential } = this.jobsListConfig
    if (this.jobsListConfig.cron) {
      const queue = new JobQueue()
      cron.schedule(this.jobsListConfig.cron, () => {
        queue.push(() => {
          const job = new Job()
          job.run({
            ...this.jobsListConfig,
            sequential
          })
        })
        queue.run()
      })
    } else {
      const job = new Job()
      job.run({
        ...this.jobsListConfig,
        sequential
      })
    }
  }
}

module.exports = Worker 