const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// GET /conversations?customerId=X
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.customerId) filter.customerId = req.query.customerId;

    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .select('-messages');
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /conversations/:id
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ conversationId: req.params.id });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /conversations/:id
router.delete('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({ conversationId: req.params.id });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
