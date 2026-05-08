const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const Conversation = require('../models/Conversation');

const SHIPMENTS_URL = process.env.SHIPMENTS_SERVICE_URL || process.env.SHIPMENTS_URL || 'http://localhost:5000';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Stable system prompt — cached on every request (ephemeral 5-min TTL)
const SYSTEM_PROMPT = `Du er en hjælpsom AI-assistent for NTG Logistics.
Du hjælper kunder og medarbejdere med at besvare spørgsmål om forsendelser.

Du har adgang til realtidsdata om forsendelser, som er givet som JSON-kontekst i brugerens besked.
Brug denne data til at give præcise og konkrete svar.

Regler:
- Svar altid på det samme sprog som brugeren skriver på (dansk eller engelsk).
- Vær kortfattet og præcis — ét godt svar er bedre end tre vage.
- Hvis data mangler eller er utilstrækkelig, sig det ærligt.
- Formater datoer som DD/MM/YYYY og vægt i kg.
- Referer til forsendelser ved deres ID (de første 8 tegn er nok).`;

/**
 * Detect the user's intent from their message.
 * Returns { intent, params } where params holds extracted values (e.g. destination).
 */
function detectIntent(message) {
  const msg = message.toLowerCase();

  const delayPatterns = /forsinkelse|forsinket|delay|delayed|sent|for sent/;
  if (delayPatterns.test(msg)) {
    return { intent: 'delays', params: {} };
  }

  const arrivalPatterns = /hvornår|ankommer|ankomst|when|arrive|arrival|levering|delivery time/;
  if (arrivalPatterns.test(msg)) {
    return { intent: 'arrival_time', params: {} };
  }

  const destinationPatterns = /(?:til|to|destination|mod|arriving in|going to)\s+([a-zæøåA-ZÆØÅ]+)/i;
  const destMatch = msg.match(destinationPatterns);
  if (destMatch) {
    return { intent: 'filter_destination', params: { destination: destMatch[1] } };
  }

  const locationPatterns = /hvor|where|befinder|location|tracking|spore|status/;
  if (locationPatterns.test(msg)) {
    return { intent: 'package_location', params: {} };
  }

  return { intent: 'general', params: {} };
}

/**
 * Fetch relevant shipment data from ShipmentService based on intent.
 */
async function fetchShipmentContext(intent, params, customerId) {
  try {
    const query = {};
    if (customerId) query.customerId = customerId;

    switch (intent) {
      case 'package_location':
      case 'arrival_time': {
        const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, { params: query });
        return data.slice(0, 10); // cap to avoid token bloat
      }

      case 'delays': {
        const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, {
          params: { ...query, status: 'in_transit' },
        });
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return data.filter((s) => new Date(s.createdAt) < sevenDaysAgo);
      }

      case 'filter_destination': {
        const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, { params: query });
        // Filter client-side since destination isn't a top-level field yet
        const dest = (params.destination || '').toLowerCase();
        return data.filter((s) =>
          JSON.stringify(s).toLowerCase().includes(dest)
        ).slice(0, 10);
      }

      default:
        if (!customerId) return [];
        const { data } = await axios.get(`${SHIPMENTS_URL}/shipments`, { params: query });
        return data.slice(0, 5);
    }
  } catch {
    return [];
  }
}

// POST /chat
router.post('/', async (req, res) => {
  const { message, customerId, conversationId } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const { intent, params } = detectIntent(message);

    const shipmentData = await fetchShipmentContext(intent, params, customerId);

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ conversationId });
    }
    if (!conversation) {
      conversation = new Conversation({ customerId });
    }

    // Build the user message with injected shipment context
    const contextBlock =
      shipmentData.length > 0
        ? `\n\n<forsendelsesdata>\n${JSON.stringify(shipmentData, null, 2)}\n</forsendelsesdata>`
        : '';

    const userContent = `${message}${contextBlock}`;

    // Keep last 10 turns to stay within context limits
    const historyMessages = conversation.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    historyMessages.push({ role: 'user', content: userContent });

    // Call Anthropic with cached system prompt
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: historyMessages,
    });

    const aiText = response.content.find((b) => b.type === 'text')?.text ?? '';

    // Persist conversation
    conversation.messages.push({ role: 'user', content: message });
    conversation.messages.push({ role: 'assistant', content: aiText });
    await conversation.save();

    res.json({
      response: aiText,
      intent,
      conversationId: conversation.conversationId,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(502).json({ error: 'Anthropic API error', detail: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
