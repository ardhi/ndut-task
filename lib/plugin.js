const path = require('path')
const schedule = require('node-schedule')

module.exports = async function (fastify, options) {
  const { _, fastGlob, lockfile, fs } = fastify.ndut.helper
  const { config } = fastify
  const mods = {}
  const job = {}

  await fs.ensureDir(options.downloadDir)
  await fs.ensureDir(options.lockDir)

  for (const n of config.nduts) {
    const files = await fastGlob(`${n.dir}/ndutTask/job/*.js`)
    for (const f of files) {
      const name = _.camelCase(`${n.alias} ${path.basename(f, '.js')}`)
      mods[name] = f
    }
  }
  const files = await fastGlob(`${config.dir.base}/ndutTask/job/*.js`)
  for (const f of files) {
    const name = _.camelCase(path.basename(f, '.js'))
    mods[name] = f
  }

  for (const name of _.keys(mods)) {
    let item = require(mods[name])
    if (_.isFunction(item)) item = await item(fastify)
    item.name = name
    item.description = item.description || _.startCase(name)
    item.multiProcess = !!item.multiProcess
    item.started = 0
    item.timeout = item.timeout || 0
    item.handler = item.handler.bind(fastify)
    const runner = function () {
      if (item.started > 0) {
        // TODO: abort running function on timeout
        /*
        if (item.timeout > 0) {
          if (Date.now () > item.started + item.timeout) {
            fastify.log.warn(`[${item.name}] timed out. Abort now`)
            item.schedule.cancel(true)
            item.started = 0
          } else {
            fastify.log.warn(`[${item.name}] still running, ${item.started + item.timeout - Date.now()} ms to timeout`)
          }
        } else fastify.log.warn(`[${item.name}] still running, skipped!`)
        */
        fastify.log.warn(`[${options.alias}:${item.name}] still running, ignore execution`)
        return
      }
      item.started = Date.now()
      fastify.log.debug(`[${options.alias}:${item.name}] started`)
      Promise.resolve()
        .then(() => {
          return item.handler()
        })
        .then(result => {
          fastify.log.debug(`[${options.alias}:${item.name}] completed in ${Date.now() - item.started} ms`)
          item.started = 0
        })
        .catch(err => {
          fastify.log.error(`[${options.alias}:${item.name}] ${err.message}`)
          item.started = 0
        })
    }
    const lockfilePath = `${options.lockDir}/${name}.lock`
    item.unlockFn = item.multiProcess ? null : await lockfile.lock(mods[name], { lockfilePath })
    if (item.time) item.schedule = schedule.scheduleJob(item.time, runner)
    job[name] = item
    fastify.log.debug(`+ Job '${name}'`)
  }

  fastify.decorate('ndutTask', { job })
}
