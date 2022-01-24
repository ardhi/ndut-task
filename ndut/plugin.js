const path = require('path')
const schedule = require('node-schedule')

const plugin = async function (scope, options) {
  const { _, fastGlob, lockfile, fs, getConfig, getNdutConfig } = scope.ndut.helper
  const config = await getConfig()
  const mods = {}
  const job = {}

  await fs.ensureDir(options.downloadDir)
  for (let n of config.nduts) {
    n = await getNdutConfig(n)
    const files = await fastGlob(`${n.dir}/ndutTask/job/*.js`)
    for (const f of files) {
      const name = _.camelCase(`${n.alias} ${path.basename(f, '.js')}`)
      mods[name] = f
    }
  }

  for (const name of _.keys(mods)) {
    let item = require(mods[name])
    if (_.isFunction(item)) item = await item(scope)
    item.name = name
    item.description = item.description || _.startCase(name)
    item.multiProcess = !!item.multiProcess
    item.started = 0
    item.timeout = item.timeout || 0
    item.handler = item.handler.bind(scope)
    const runner = function () {
      if (item.started > 0) {
        // TODO: abort running function on timeout
        /*
        if (item.timeout > 0) {
          if (Date.now () > item.started + item.timeout) {
            scope.log.warn(`[${item.name}] timed out. Abort now`)
            item.schedule.cancel(true)
            item.started = 0
          } else {
            scope.log.warn(`[${item.name}] still running, ${item.started + item.timeout - Date.now()} ms to timeout`)
          }
        } else scope.log.warn(`[${item.name}] still running, skipped!`)
        */
        scope.log.warn(`[${options.alias}:${item.name}] still running, ignore execution`)
        return
      }
      item.started = Date.now()
      scope.log.debug(`[${options.alias}:${item.name}] started`)
      Promise.resolve()
        .then(() => {
          return item.handler()
        })
        .then(result => {
          scope.log.debug(`[${options.alias}:${item.name}] completed in ${Date.now() - item.started} ms`)
          item.started = 0
        })
        .catch(err => {
          scope.log.error(`[${options.alias}:${item.name}] ${err.message}`)
          item.started = 0
        })
    }
    const lockfilePath = `${config.dir.lock}/${name}.lock`
    item.unlockFn = item.multiProcess ? null : await lockfile.lock(mods[name], { lockfilePath })
    if (item.time) item.schedule = schedule.scheduleJob(item.time, runner)
    job[name] = item
    scope.log.debug(`* Job '${name}'`)
  }

  scope.ndutTask.job = job
}

module.exports = async function () {
  const { fp } = this.ndut.helper
  return fp(plugin)
}
