const express = require('express');
const router = express.Router();
const Sender = require('../models/Sender');

// GET /senders?type=shipper|consignee
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;

    const senders = await Sender.find(filter).sort({ createdAt: -1 });
    res.json(senders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /senders/:id
router.get('/:id', async (req, res) => {
  try {
    const sender = await Sender.findOne({ senderId: req.params.id });
    if (!sender) return res.status(404).json({ error: 'Sender not found' });
    res.json(sender);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /senders
router.post('/', async (req, res) => {
  try {
    const sender = new Sender(req.body);
    await sender.save();
    res.status(201).json(sender);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// PUT /senders/:id
router.put('/:id', async (req, res) => {
  try {
    const sender = await Sender.findOneAndUpdate(
      { senderId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!sender) return res.status(404).json({ error: 'Sender not found' });
    res.json(sender);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /senders/:id
router.delete('/:id', async (req, res) => {
  try {
    const sender = await Sender.findOneAndDelete({ senderId: req.params.id });
    if (!sender) return res.status(404).json({ error: 'Sender not found' });
    res.json({ message: 'Sender deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
