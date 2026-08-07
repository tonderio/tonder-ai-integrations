import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { tonderRequest } from '../tonder-api.js';
import { getOrder, attachTransaction } from '../orders.js';

export const charges = Router();

/**
 * Card charge. The browser posts the raw card here, this server tokenizes it
 * and builds the Direct API envelope.
 */
charges.post('/api/charges/card', async (req, res) => {
  const { order_id, email, card } = req.body;
  const order = await getOrder(order_id);

  if (!order) return res.status(404).json({ error: 'Unknown order' });

  const token = await tokenizeCard(card);

  const transaction = await tonderRequest('/api/v1/process/', {
    method: 'POST',
    idempotencyKey: randomUUID(),
    body: buildEnvelope(order, email, {
      type: 'CARD',
      card_number: token.card_number,
      expiration_month: token.expiration_month,
      expiration_year: token.expiration_year,
      cvv: token.cvv,
      cardholder_name: token.cardholder_name,
    }),
  });

  await attachTransaction(order_id, transaction);
  res.json(transaction);
});

/**
 * Alternative payment methods: SPEI, OXXO, SafetyPay bank transfer.
 */
charges.post('/api/charges/apm', async (req, res) => {
  const { order_id, email, method, bank_code } = req.body;
  const order = await getOrder(order_id);

  if (!order) return res.status(404).json({ error: 'Unknown order' });

  const transaction = await tonderRequest('/api/v1/process/', {
    method: 'POST',
    idempotencyKey: randomUUID(),
    body: buildEnvelope(order, email, {
      type: method,
      ...(bank_code ? { bank_code } : {}),
    }),
  });

  await attachTransaction(order_id, transaction);
  res.json(transaction);
});

charges.get('/api/charges/methods', async (_req, res) => {
  const methods = await tonderRequest('/api/v1/payment-methods/');
  res.json(methods);
});

charges.get('/api/charges/:transactionId', async (req, res) => {
  res.json(await tonderRequest(`/api/v1/transactions/${req.params.transactionId}/`));
});

function buildEnvelope(order, email, payment_method) {
  return {
    customer: { email },
    cart: {
      total: order.total,
      items: order.items,
    },
    currency: order.currency,
    client_reference: order.reference,
    payment_method,
  };
}

// Placeholder for the merchant's own vault/tokenization step.
async function tokenizeCard(card) {
  return card;
}
