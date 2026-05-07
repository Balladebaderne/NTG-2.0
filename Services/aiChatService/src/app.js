const express = require('express');
const app = express();

const chatRouter = require('./routes/chat');
const conversationsRouter = require('./routes/conversations');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-chat-service' });
});

app.use('/chat', chatRouter);
app.use('/conversations', conversationsRouter);

module.exports = app;
