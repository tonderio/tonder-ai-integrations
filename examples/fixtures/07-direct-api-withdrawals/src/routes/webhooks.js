import { Router } from 'express';
import { applyWebhook } from '../orders.js';
import { isSettled } from './withdrawals.js';

export const webhooks = Router();

/**
 * One endpoint receives both payment and withdrawal events. They are told
 * apart by whether the payload carries a payment method.
 */
webhooks.post('/api/webhooks/tonder', async (req, res) => {
  const event = req.body;

  if (event.payment_method_type) {
    const matched = await applyWebhook(event);
    console.log(`[webhook:payment] ${event.client_reference} ${event.status} matched=${matched}`);
  } else if (isSettled(event.status)) {
    console.log(`[webhook:withdrawal] ${event.id} settled as ${event.status}`);
  } else {
    console.log(`[webhook:unknown] ${event.id} ${event.status}`);
  }

  res.sendStatus(200);
});
