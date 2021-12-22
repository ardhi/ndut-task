const plugin = require('./lib/plugin')

module.exports = async function () {
  const { _, fp } = this.ndut.helper
  const { config } = this
  const name = 'ndut-task'
  const ndutConfig = _.find(config.nduts, { name }) || {}
  ndutConfig.downloadDir = `${config.dir.data}/ndutTask/download`
  ndutConfig.prefix = ndutConfig.prefix || '/task'

  return { name, plugin: fp(plugin), options: ndutConfig }
}
