# messageBroker

Node.js + Express service that wraps a RabbitMQ connection.  
At this stage it is **standalone** — not wired to any other service.

## Structure

```
messageBroker/
├── Dockerfile
├── package.json
└── src/
    ├── index.js    # Express app + startup
    └── broker.js   # connect / publish / consume helpers
```

## Environment variables

| Variable          | Default     | Description                        |
|-------------------|-------------|------------------------------------|
| `RABBITMQ_HOST`   | `rabbitmq`  | RabbitMQ hostname                  |
| `RABBITMQ_PORT`   | `5672`      | AMQP port                          |
| `RABBITMQ_USER`   | `guest`     | Username                           |
| `RABBITMQ_PASS`   | `guest`     | Password                           |
| `PORT`            | `3000`      | HTTP port for the Express server   |

## Endpoints

- `GET /health` — returns `{ status: "ok" }` when connected to RabbitMQ

## Management UI

The RabbitMQ management UI is available at **http://localhost:15672**  
Default credentials: `guest` / `guest`

## Connecting services later

Import `broker.js` helpers (or call this service's HTTP API) when you're ready to wire
other services in. Use `publish()` to send events and `consume()` to subscribe to queues.

---

## Templates

### Publisher

```js
const broker = require('./src/broker');

async function main() {
  await broker.connect();

  // Publish a message to an exchange with a routing key
  await broker.publish(
    'my-exchange',   // exchange name (must be declared on the RabbitMQ server)
    'my.routing.key',
    { hello: 'world', timestamp: Date.now() }
  );
}

main().catch(console.error);
```

### Consumer

```js
const broker = require('./src/broker');

async function main() {
  const channel = await broker.connect();

  // Declare the exchange before binding (safe to call multiple times)
  await channel.assertExchange('my-exchange', 'topic', { durable: true });

  // Declare and bind the queue
  const q = await channel.assertQueue('my-queue', { durable: true });
  await channel.bindQueue(q.queue, 'my-exchange', 'my.routing.key');

  // Start consuming
  await broker.consume('my-queue', (message) => {
    console.log('Received:', message);
    // handle message here
  });
}

main().catch(console.error);
```

### Exchange types (quick reference)

| Type      | Routing behaviour                                        |
|-----------|----------------------------------------------------------|
| `direct`  | Routes to queues whose binding key exactly matches      |
| `topic`   | Routes by pattern — `*` (one word) and `#` (many words) |
| `fanout`  | Broadcasts to all bound queues, ignores routing key     |
| `headers` | Routes based on message header attributes               |
