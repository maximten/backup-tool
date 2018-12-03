const chalk = require('chalk')
const moment = require('moment')

const getTimestamp = () => (
  moment().format('YYYY-MM-DD HH:mm:ss')
)

const formString = (namespace, message) => (
  `[${getTimestamp()}] ${namespace} - ${message}`
)

const info = (namespace, message) => {
  console.log(formString(namespace, message))
}

const success = (namespace, message) => {
  console.log(chalk.green(formString(namespace, message)))
}

const error = (namespace, message) => {
  console.log(chalk.red(formString(namespace, message)))
}

class Logger {
  
  constructor(namespace) {
    this.namespace = namespace
  }

  info (message) {
    info(this.namespace, message)
  }

  success (message) {
    success(this.namespace, message)
  }

  error (message) {
    error(this.namespace, message)
  } 
} 

module.exports = {
  info, 
  success,
  error,
  Logger
}