const assert = require('assert')
const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')
const validate = require('../lib/validate')

describe('validate', () => {
  it('should validate example config file', () => {
    const filePath = path.resolve('./backup-config.example.yml')
    const content = fs.readFileSync(filePath, 'utf8')
    const config = yaml.safeLoad(content)
    const isValid = validate(config)
    assert.equal(true, isValid)
  })
})