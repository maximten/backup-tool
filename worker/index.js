const AppConfig = require('./src/AppConfig')
const JobConfigFileReader = require('./src/JobConfigFileReader')
const JobConfigValidator = require('./src/JobConfigValidator')
const Worker = require('./src/Worker')

const appConfig = new AppConfig()
if (appConfig.isStandalone()) {
  const jobConfigFile = appConfig.getJobConfigFile()
  const jobConfigFileReader = new JobConfigFileReader(jobConfigFile)
  const jobsListConfig = jobConfigFileReader.getConfig()
  const jobConfigValidator = new JobConfigValidator()
  jobConfigValidator.validate(jobsListConfig)
  const worker = new Worker(jobsListConfig)
  worker.run()
}