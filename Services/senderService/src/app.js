const express = require('express');
const app = express();

const sendersRouter = require('./routes/senders');
const shipmentsRouter = require('./routes/shipments');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sender-service' });
});

app.use('/senders', sendersRouter);
app.use('/senders', shipmentsRouter);

module.exports = app;
