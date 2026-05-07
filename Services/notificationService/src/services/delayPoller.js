const { scanForDelayedShipments } = require('./delayNotificationService')

function shouldPoll() {
  return process.env.DELAY_POLLING_ENABLED !== 'false'
}

function getIntervalMs() {
  return Number(process.env.DELAY_POLLING_INTERVAL_MS || 60000)
}

function getInitialDelayMs() {
  return Number(process.env.DELAY_POLLING_INITIAL_DELAY_MS || 10000)
}

function startDelayPolling() {
  if (!shouldPoll()) return null

  const intervalMs = getIntervalMs()
  const initialDelayMs = getInitialDelayMs()
  const runScan = async () => {
    try {
      const result = await scanForDelayedShipments()
      if (result.created > 0) {
        console.log(`Created ${result.created} delay notification(s)`)
      }
    } catch (err) {
      console.error('Delay notification scan failed:', err.message)
    }
  }

  setTimeout(runScan, initialDelayMs)
  return setInterval(runScan, intervalMs)
}

module.exports = {
  startDelayPolling,
}
