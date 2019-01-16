const AppConfig = require('./src/AppConfig')
const JobsListConfigFileReader = require('./src/JobsListConfigFileReader')
const JobsListConfigValidator = require('./src/JobsListConfigValidator')
const Worker = require('./src/Worker')

const appConfig = new AppConfig()
if (appConfig.isStandalone()) {
  const jobsListConfigFile = appConfig.getJobsListConfigFile()
  const jobsListConfigFileReader = new JobsListConfigFileReader(jobsListConfigFile)
  const jobsListConfig = jobsListConfigFileReader.getConfig()
  const jobsListConfigValidator = new JobsListConfigValidator()
  jobsListConfigValidator.validate(jobsListConfig)
  const worker = new Worker(jobsListConfig)
  worker.run()
}

