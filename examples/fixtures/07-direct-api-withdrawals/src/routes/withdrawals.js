import { Router } from 'express';
import { tonderRequest } from '../tonder-api.js';
import { recordPayout, listPayouts } from '../orders.js';

export const withdrawals = Router();

/**
 * Seller payouts. Money moves out of the merchant balance to a seller's
 * bank account. This is a back-office operation triggered by an operator,
 * never by a shopper in the browser.
 */
withdrawals.post('/api/withdrawals', async (req, res) => {
  const { seller_id, amount, currency, bank_account, reference } = req.body;

  if (!seller_id || !amount || !bank_account) {
    return res.status(400).json({ error: 'seller_id, amount and bank_account are required' });
  }

  const withdrawal = await tonderRequest('/api/v1/withdrawals/', {
    method: 'POST',
    body: {
      seller: seller_id,
      amount,
      currency: currency ?? 'MXN',
      bank_account,
      reference,
    },
  });

  await recordPayout(seller_id, withdrawal);

  res.status(201).json(withdrawal);
});

withdrawals.get('/api/withdrawals/:id', async (req, res) => {
  const withdrawal = await tonderRequest(`/api/v1/withdrawals/${req.params.id}/`);
  res.json(withdrawal);
});

withdrawals.get('/api/sellers/:sellerId/withdrawals', async (req, res) => {
  res.json(await listPayouts(req.params.sellerId));
});

/**
 * Withdrawal statuses do not share the payment vocabulary. `paid_full` and
 * `paid_partial` are settlement outcomes and only ever appear here.
 */
export function isSettled(status) {
  return status === 'paid_full' || status === 'paid_partial' || status === 'rejected';
}
