const CommandConstructor = require('./CommandConstructor') 
const ConsoleLogger = require('./ConsoleLogger')

class Job {
  async run (config) {
    const { targets, sequential } = config
    const commandConstructor = new CommandConstructor()
    const promises = []
  
    for (const target of Object.entries(targets)) {
      const [targetName, params] = target
      const logger = new ConsoleLogger(targetName)
      const fullParams = { targetName, logger, ...params }
  
      const command = commandConstructor.constructCommand(params)
  
      if (sequential) {
        await command.execute(fullParams)
      } else {
        promises.push(command.execute(fullParams))
      }
    }
  
    if (sequential) {
      return true
    } else {
      return Promise.all(promises)
    }
  }
}

module.exports = Job
  