const path = require('path')
const schedule = require('node-schedule')

const plugin = async function (scope, options) {
  const { _, fastGlob, lockfile, fs, getConfig, getNdutConfig } = scope.ndut.helper
  const config = getConfig()
  scope.ndutTask.mods = scope.ndutTask.mods || {}
  scope.ndutTask.job = scope.ndutTask.job || {}
  const mods = scope.ndutTask.mods
  const job = scope.ndutTask.job

  await fs.ensureDir(options.downloadDir)
  for (const n of config.nduts) {
    const cfg = getNdutConfig(n)
    const files = await fastGlob(`${cfg.dir}/ndutTask/job/*.js`)
    for (const f of files) {
      const name = _.camelCase(`${cfg.alias} ${path.basename(f, '.js')}`)
      mods[name] = f
    }
  }

  for (const name of _.keys(mods)) {
    let item = mods[name]
    if (_.isString(item)) {
      item = require(item)
      if (_.isFunction(item)) item = await item.call(scope)
    }
    if (_.isEmpty(item)) continue
    if (!_.isArray(item)) item = [item]
    for (const i of item) {
      i.name = i.name || name
      if (!i.time) throw new Error(`Job '${i.name}' is missing time pattern!`)
      i.description = i.description
      i.started = 0
      i.timeout = i.timeout || 0
      i.handler = i.handler.bind(scope)
      const runner = function () {
        if (i.started > 0) {
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
          scope.log.warn(`[${options.alias}:${i.name}] still running, ignore execution`)
          return
        }
        i.started = Date.now()
        scope.log.debug(`[${options.alias}:${i.name}] started`)
        Promise.resolve()
          .then(() => {
            return i.handler(i.params)
          })
          .then(result => {
            let text = `[${options.alias}:${i.name}] completed in ${Date.now() - i.started} ms`
            if (result) text += `, message: ${result}`
            i.started = 0
            scope.log.debug(text)
          })
          .catch(err => {
            i.started = 0
            scope.log.error(`[${options.alias}:${i.name}] ${err.message}`)
          })
      }
      /*
      if (_.isString(mods[name])) {
        const lockfilePath = `${config.dir.lock}/${name}.lock`
        item.unlockFn = await lockfile.lock(mods[name], { lockfilePath })
      }
      */
      if (i.time) i.schedule = schedule.scheduleJob(i.time, runner)
      job[i.name] = i
      scope.log.debug(`* Job '${i.name}'`)
      if (i.runEarly) i.handler(i.params)
    }
  }
}

module.exports = async function () {
  const { fp } = this.ndut.helper
  return fp(plugin)
}
