module.exports = async function () {
  const { getConfig } = this
  const config = await getConfig()
  return {
    name: 'ndut-task',
    downloadDir: `${config.dir.data}/download`,
    lockDir: `${config.dir.data}/lock`
  }
}
