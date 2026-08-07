import express from 'express';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const TONDER_API_URL = process.env.TONDER_API_URL;
const TONDER_SECRET_KEY = process.env.TONDER_SECRET_KEY;

const CATALOG = {
  'VB-CART': { total: 640, currency: 'MXN', description: 'Espresso subscription' },
};

/**
 * Server-to-server charge. The browser posts the card here, this server
 * tokenizes it and builds the Direct API envelope itself.
 */
app.post('/api/charge', async (req, res) => {
  const { email, method, card, order_id } = req.body;
  const order = CATALOG[order_id];

  if (!order) {
    return res.status(400).json({ error: 'Unknown order' });
  }

  let payment_method;

  if (method === 'CARD') {
    const token = await tokenizeCard(card);
    payment_method = {
      type: 'CARD',
      card_number: token.card_number,
      expiration_month: token.expiration_month,
      expiration_year: token.expiration_year,
      cvv: token.cvv,
      cardholder_name: token.cardholder_name,
    };
  } else {
    payment_method = { type: method };
  }

  const response = await fetch(`${TONDER_API_URL}/api/v1/process/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${TONDER_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({
      customer: { email },
      cart: {
        total: order.total,
        items: [
          {
            description: order.description,
            quantity: 1,
            price_unit: order.total,
            amount_total: order.total,
          },
        ],
      },
      currency: order.currency,
      client_reference: order_id,
      payment_method,
    }),
  });

  const transaction = await response.json();

  if (!response.ok) {
    return res.status(response.status).json({ error: transaction });
  }

  await recordTransaction(order_id, transaction);
  res.json(transaction);
});

app.get('/api/transactions/:id', async (req, res) => {
  const response = await fetch(`${TONDER_API_URL}/api/v1/transactions/${req.params.id}/`, {
    headers: { Authorization: `Token ${TONDER_SECRET_KEY}` },
  });
  res.status(response.status).json(await response.json());
});

app.post('/api/webhooks/tonder', (req, res) => {
  const { id, status, client_reference, payment_method_type } = req.body;
  console.log(`[webhook] ${client_reference} ${payment_method_type} ${status} (${id})`);
  res.sendStatus(200);
});

// Placeholder for the merchant's own vault/tokenization step.
async function tokenizeCard(card) {
  return card;
}

// Placeholder for the merchant's own order store.
async function recordTransaction(orderId, transaction) {
  console.log(`[order] ${orderId} -> ${transaction.id} ${transaction.status}`);
}

app.listen(3000, () => console.log('Checkout on http://localhost:3000'));
