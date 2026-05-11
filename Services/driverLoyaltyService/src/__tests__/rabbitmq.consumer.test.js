const { startWithRetry } = require('../consumers/rabbitmq.consumer')

describe('startWithRetry', () => {
  it('retries transient consumer startup failures', async () => {
    const connect = jest.fn()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockResolvedValueOnce({ status: 'consuming', queue: 'driver-loyalty.tracking-events' })
    const logger = { warn: jest.fn() }

    const result = await startWithRetry(connect, {
      logger,
      maxAttempts: 2,
      retryDelayMs: 0,
    })

    expect(result).toEqual({ status: 'consuming', queue: 'driver-loyalty.tracking-events' })
    expect(connect).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      'Driver Loyalty consumer start failed (connect ECONNREFUSED); retrying in 0ms'
    )
  })

  it('throws after the configured retry attempts are exhausted', async () => {
    const error = new Error('connect ECONNREFUSED')
    const connect = jest.fn().mockRejectedValue(error)
    const logger = { warn: jest.fn() }

    await expect(startWithRetry(connect, {
      logger,
      maxAttempts: 1,
      retryDelayMs: 0,
    })).rejects.toThrow('connect ECONNREFUSED')

    expect(connect).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
