const test = require('node:test')
const assert = require('node:assert/strict')

function loadRepositoryWithPool(pool) {
  const dbPath = require.resolve('../db')
  const repositoryPath = require.resolve('../services/notificationsRepository')

  delete require.cache[repositoryPath]
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: pool,
  }

  return require('../services/notificationsRepository')
}

test('lists notifications filtered by recipient role and unread status', async () => {
  const queries = []
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params })
      return { rows: [] }
    },
  }
  const { listNotifications } = loadRepositoryWithPool(pool)

  await listNotifications({ recipientRole: 'support', unreadOnly: true })

  assert.match(queries[0].sql, /recipient_role = \$1/)
  assert.match(queries[0].sql, /read_at IS NULL/)
  assert.deepEqual(queries[0].params, ['support'])
})

test('creates role-targeted notifications independently from customer notifications', async () => {
  const queries = []
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params })
      return {
        rows: [
          {
            id: 'notification-1',
            recipientRole: params[1],
          },
        ],
      }
    },
  }
  const { createNotification } = loadRepositoryWithPool(pool)

  const notification = await createNotification({
    recipientRole: 'logistics',
    shipmentId: 'shipment-1',
    type: 'shipment_delayed',
    title: 'Shipment delayed',
    message: 'Shipment shipment-1 is delayed.',
  })

  assert.equal(notification.recipientRole, 'logistics')
  assert.match(queries[0].sql, /recipient_role/)
  assert.match(queries[0].sql, /ON CONFLICT DO NOTHING/)
  assert.deepEqual(queries[0].params.slice(0, 4), [
    null,
    'logistics',
    'shipment-1',
    'shipment_delayed',
  ])
})

test('rejects notifications without a customer or role recipient', async () => {
  const pool = {
    query: async () => {
      throw new Error('query should not run')
    },
  }
  const { createNotification } = loadRepositoryWithPool(pool)

  await assert.rejects(
    createNotification({
      shipmentId: 'shipment-1',
      type: 'shipment_delayed',
      title: 'Shipment delayed',
      message: 'Shipment shipment-1 is delayed.',
    }),
    /requires receiverCustomerId or recipientRole/
  )
})
