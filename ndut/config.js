module.exports = async function (scope) {
  const { getConfig } = scope.ndut.helper
  const config = getConfig()
  return {
    name: 'ndut-task',
    singleWorker: true,
    downloadDir: `${config.dir.data}/download`
  }
}
