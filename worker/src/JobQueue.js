class JobQueue {
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

module.exports = JobQueue 