const express = require('express');
const router = express.Router();
const axios = require('axios');
const Sender = require('../models/Sender');

const SHIPMENTS_URL = process.env.SHIPMENTS_URL || 'http://localhost:5000';

// GET /senders/:id/shipments — hent alle shipments for en shipper
router.get('/:id/shipments', async (req, res) => {
  try {
    const sender = await Sender.findOne({ senderId: req.params.id });
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    const response = await axios.get(`${SHIPMENTS_URL}/shipments`, {
      params: { senderId: req.params.id, status: req.query.status },
    });
    res.json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    res.status(502).json({ error: 'Shipments service unavailable' });
  }
});

// GET /senders/:id/shipments/:shipmentId — hent specifikt shipment for en shipper
router.get('/:id/shipments/:shipmentId', async (req, res) => {
  try {
    const sender = await Sender.findOne({ senderId: req.params.id });
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    const response = await axios.get(`${SHIPMENTS_URL}/shipments/${req.params.shipmentId}`);
    const shipment = response.data;

    if (shipment.senderId !== req.params.id) {
      return res.status(403).json({ error: 'Shipment does not belong to this sender' });
    }

    res.json(shipment);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    res.status(502).json({ error: 'Shipments service unavailable' });
  }
});

module.exports = router;
