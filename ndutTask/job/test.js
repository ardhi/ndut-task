module.exports = {
  time: '* * * * * *',
  timeout: 3000,
  handler: async function (params) {
    const { aneka } = this.ndut.helper
    const { delay } = aneka
    await delay(10000)
    this.log.info('release...')
  }
}
