const chalk = require('chalk')
const moment = require('moment')

class ConsoleLogger {
  constructor(namespace) {
    this.namespace = namespace
  }
  getTimestamp() {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }
  formString(namespace, message) {
    return `[${this.getTimestamp()}] ${namespace} - ${message}`
  }
  info (message) {
    console.log(this.formString(this.namespace, message))
  }
  success (message) {
    console.log(chalk.green(this.formString(this.namespace, message)))
  }
  error (message) {
    console.log(chalk.red(this.formString(this.namespace, message)))
  } 
}

module.exports = ConsoleLogger