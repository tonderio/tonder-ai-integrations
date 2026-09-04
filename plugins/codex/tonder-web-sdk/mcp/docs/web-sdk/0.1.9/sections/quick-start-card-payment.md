## Quick start: card payment

### 1. Add containers for card fields

```html
<form id="checkout-form">
  <div id="collect-cardholder-name" class="card-field"></div>
  <div id="collect-card-number" class="card-field"></div>
  <div id="collect-expiration-month" class="card-field"></div>
  <div id="collect-expiration-year" class="card-field"></div>
  <div id="collect-cvv" class="card-field"></div>

  <button type="submit">Pay</button>
</form>
```

Cap each SDK mount container so the secure iframe does not visually grow before it settles into the input layout:

```css
.card-field {
  width: 100%;
  max-height: 90px;
}
```

### 2. Initialize, mount, and pay

```ts
import { createTonder } from '@tonder.io/web-sdk';

const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  session: {
    customer: {
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
    },
  },
});

await tonder.init();

const card_fields = tonder.create('card_fields');

await card_fields.mount();

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  metadata: { cart_id: 'cart_789' },
  payment_method: { type: 'card' },
});

if (transaction.status === 'Success' || transaction.status === 'Authorized') {
  // Show confirmation.
} else if (transaction.status === 'Pending') {
  // The customer may need to complete 3DS or an asynchronous payment method.
  // Confirm final state with webhooks or getTransaction().
} else {
  // Show a recoverable payment message.
  console.warn(transaction.decline_code, transaction.decline_reason);
}

// Release the secure card fields once you are done with the form.
card_fields.unmount();
```

Whether that final `unmount()` is optional or required depends on how your checkout navigates — see [Component lifecycle](#component-lifecycle).

**If this throws `SECURE_TOKEN_REQUIRED`, your business has Card on File enabled.** A one-time card payment needs no `session.secure_token`, but when Card on File is on for your business the SDK stores the card as part of the charge, and storing a card always needs one. It is an account setting rather than something in your code, so the same snippet works for one business and fails for another. Add the token — [Backend secure token endpoint](#backend-secure-token-endpoint) — and it applies to every flow you build afterwards.
