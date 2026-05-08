const express = require('express');
const broker = require('./broker');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  const connected = !!broker.getChannel();
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'disconnected' });
});

async function main() {
  try {
    await broker.connect();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[broker] HTTP server listening on port ${PORT}`);
  });
}

main();
