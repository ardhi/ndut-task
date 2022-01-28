module.exports = async function () {
  const { getConfig } = this
  const config = getConfig()
  return {
    name: 'ndut-task',
    downloadDir: `${config.dir.data}/download`
  }
}
