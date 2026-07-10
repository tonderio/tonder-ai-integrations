## Payment flows

### New card

```ts
await tonder.init();

const card_fields = tonder.create('card_fields');

await card_fields.mount();

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'card' },
});
```

### Saved card

Saved-card operations require both `session.customer` and `session.secure_token`. If you are not sure whether your business has Card on File enabled, confirm it with the Tonder team before launching this flow.

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  session: {
    customer: { email: 'ada@example.com' },
    secure_token: await getSecureTokenFromYourBackend(),
  },
});

await tonder.init();

const cards = await tonder.getCustomerCards();
const selected_card = cards[0];

// Mount saved-card CVV only when the card cannot be charged through an
// existing Card-on-File subscription. The SDK collects this update context
// automatically during pay().
if (!selected_card.subscription_id) {
  const cvv = tonder.create('card_fields', {
    card_id: selected_card.card_id,
    fields: ['cvv'],
  });

  await cvv.mount();
}

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'saved_card', card_id: selected_card.card_id },
});
```

### Save a new card

Card enrollment requires both `session.customer` and `session.secure_token`. Mint the secure token on your backend before creating the SDK instance.

```ts
const card_fields = tonder.create('card_fields');

await card_fields.mount();

const enrollment = await tonder.enrollCard();
// { card_id: 'card_123', subscription_id: 'sub_123' }
```

### Alternative payment methods

Use `getPaymentMethods()` when you want to render the methods enabled for your business. This call is optional: if your checkout already knows which method it wants to offer, pass the method code directly to `pay()` (`{ type: 'spei' }`, `{ type: 'oxxopay' }`, etc.).

For bank-backed SafetyPay methods, use `getPaymentMethodBanks()` and build `payment_method.config` from the selected bank:

| Field      | Value                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| `country`  | `bank.country` from `getPaymentMethodBanks()` (for example, `Mexico`).            |
| `channel`  | `bank.channel` from `getPaymentMethodBanks()` (`WP` for cash, `OL` for transfer). |
| `bank_ids` | `[{ id: bank.code }]` using the bank routing code, not the internal `bank.id`.    |

```ts
const methods = await tonder.getPaymentMethods();
const banks = await tonder.getPaymentMethodBanks();
```

```ts
const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'oxxopay' },
});
```

```ts
const banks = await tonder.getPaymentMethodBanks();
const bank = banks.cash[0];

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: {
    type: 'safetypayCash',
    config: {
      country: bank.country, // e.g. 'Mexico'
      channel: bank.channel, // 'WP' for cash, 'OL' for transfer
      bank_ids: [{ id: bank.code }], // e.g. [{ id: '8186' }]
    },
  },
});
```

APM/SPEI methods often settle asynchronously. Use webhooks for fulfillment.
