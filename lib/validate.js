const validate = (config) => {
  if (typeof config.version === 'undefined') {
    throw new Error('No version in config file')
  }
  if (typeof config.targets !== 'object') {
    throw new Error('No targets in config file')
  }
  Object.entries(config.targets).forEach(([name, params]) => {
    if (!params.src) {
      throw new Error(`No src param in ${name} target`)
    }
    if (!params.dest) {
      throw new Error(`No dest param in ${name} target`)
    }
  })
  return true
}

module.exports = validate