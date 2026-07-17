# Tonder Web SDK Flows

## Card payment

Use when the shopper enters a new card for a payment.

Required setup:

- `createTonder({ api_key, environment, session.customer })` using public app configuration for `api_key` and `environment`, not hardcoded merchant values
- `await tonder.init()`
- `tonder.create('card_fields').mount()`

Payment call:

```ts
await tonder.pay({
  amount: 150,
  currency: 'MXN',
  client_reference: 'order_123',
  // Use a stable key for each checkout attempt so retries do not create duplicate charges.
  idempotency_key: 'checkout_attempt_123',
  return_url: window.location.href,
  payment_method: { type: 'card' }
});
```

## Card enrollment

Use when saving a new customer card without charging immediately.

Required setup:

- `session.customer`
- `session.secure_token`
- mounted `card_fields`

Call:

```ts
await tonder.enrollCard();
```

On success, expect secure fields to reset if the SDK supports it.

## Saved cards

Use when customer cards already exist.

Required setup:

- `session.customer`
- `session.secure_token`

List cards:

```ts
const cards = await tonder.getCustomerCards();
```

Payment call:

```ts
await tonder.pay({
  amount: 150,
  currency: 'MXN',
  client_reference: 'order_123',
  // Use a stable key for each checkout attempt so retries do not create duplicate charges.
  idempotency_key: 'checkout_attempt_123',
  return_url: window.location.href,
  payment_method: {
    type: 'saved_card',
    card_id: selectedCard.card_id
  }
});
```

If a selected card requires CVV, mount the saved-card CVV field according to the SDK API before paying.

## Payment methods

Use `getPaymentMethods()` when rendering enabled APMs. It is optional if the merchant already knows the method code.

```ts
const methods = await tonder.getPaymentMethods();

await tonder.pay({
  amount: 150,
  currency: 'MXN',
  client_reference: 'order_123',
  // Use a stable key for each checkout attempt so retries do not create duplicate charges.
  idempotency_key: 'checkout_attempt_123',
  return_url: window.location.href,
  payment_method: { type: 'oxxopay' }
});
```

APM payments are often asynchronous. Do not fulfill from the browser alone.

## SafetyPay banks

Use `getPaymentMethodBanks()` for SafetyPay bank-backed flows.

```ts
const banks = await tonder.getPaymentMethodBanks();
```

Use selected bank values to build the payment method:

```ts
await tonder.pay({
  amount: 150,
  currency: 'MXN',
  client_reference: 'order_123',
  // Use a stable key for each checkout attempt so retries do not create duplicate charges.
  idempotency_key: 'checkout_attempt_123',
  return_url: window.location.href,
  payment_method: {
    type: 'safetypayCash',
    config: {
      country: selectedBank.country,
      channel: selectedBank.channel,
      bank_ids: [{ id: selectedBank.code }]
    }
  }
});
```

Use `safetypayCash` for cash/WP flows and `safetypayTransfer` for transfer/OL flows.


## Secure token and COF reminder

Saved-card, list-card, remove-card, card enrollment, and Card-on-File operations require a short-lived `session.secure_token` minted by the merchant backend with Tonder server-side credentials. Do not generate or hardcode this token in browser code. If the merchant is unsure whether Card on File is enabled for their business, they should confirm with the Tonder team before launching saved-card flows.
