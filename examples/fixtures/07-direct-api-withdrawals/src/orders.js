const ORDERS = new Map([
  [
    'PT-3390',
    {
      reference: 'PT-3390',
      total: 1580,
      currency: 'MXN',
      items: [{ description: 'Espresso subscription', quantity: 1, price_unit: 1580, amount_total: 1580 }],
      transactions: [],
    },
  ],
]);

const PAYOUTS = new Map();

export async function getOrder(reference) {
  return ORDERS.get(reference) ?? null;
}

export async function attachTransaction(reference, transaction) {
  const order = ORDERS.get(reference);
  if (!order) return;
  order.transactions.push({ id: transaction.id, status: transaction.status });
}

export async function applyWebhook({ client_reference, id, status }) {
  const order = ORDERS.get(client_reference);
  if (!order) return false;
  const existing = order.transactions.find((entry) => entry.id === id);
  if (existing) existing.status = status;
  else order.transactions.push({ id, status });
  return true;
}

export async function recordPayout(sellerId, withdrawal) {
  const current = PAYOUTS.get(sellerId) ?? [];
  current.push(withdrawal);
  PAYOUTS.set(sellerId, current);
}

export async function listPayouts(sellerId) {
  return PAYOUTS.get(sellerId) ?? [];
}
