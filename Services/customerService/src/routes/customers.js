const express = require('express')
const router = express.Router()
const Customer = require('../models/Customer')

// GET /customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find()
    res.json(customers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.id })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    res.json(customer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /customers
router.post('/', async (req, res) => {
  try {
    const customer = new Customer(req.body)
    await customer.save()
    res.status(201).json(customer)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /customers/:id
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { customerId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    res.json(customer)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ customerId: req.params.id })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    res.json({ message: 'Customer deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
