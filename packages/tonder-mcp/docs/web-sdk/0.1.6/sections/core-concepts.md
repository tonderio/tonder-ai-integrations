## Core concepts

### Initialization

Call `await tonder.init()` before mounting card fields, creating payments, or using saved-card operations. `getTransaction()`, `getPaymentMethods()`, and `getPaymentMethodBanks()` are read-only and can be used without `init()`.

### Customer context

`session.customer` is optional at `createTonder()` time. It is required when the SDK creates a payment or manages saved cards.

```ts
// Return page / read-only reconciliation.
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
});

const transaction = await tonder.getTransaction('txn_123');
```

### Card on File (COF)

Card on File (COF) lets a business save a shopper's card and charge it later through a processor-backed subscription/authorization. Ask the Tonder team whether COF is enabled for your business before building saved-card flows.

When COF is enabled, saved cards may include `subscription_id`. Cards with `subscription_id` can be charged directly as saved cards. Cards without `subscription_id` require CVV collection so the SDK can save/update the card and create the subscription before processing the payment. In both saved-card cases, `pay({ payment_method: { type: 'saved_card' } })` still needs `session.secure_token` because the SDK must read the customer's saved-card record before deciding which path to use.

Because those operations create, list, update, or remove stored card records, they require both:

- `session.customer`
- `session.secure_token`

For new-card payments, `session.secure_token` is only required when the SDK must perform Card-on-File setup as part of the payment flow. Plain one-time new-card payments do not require it.

### Presentation mode

When a payment requires a hosted step, the SDK uses `presentation_mode`:

| Mode       | Behavior                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `redirect` | Browser navigates to the hosted page. Use `return_url`, `getTransaction()`, and webhooks to confirm final status.                     |
| `embedded` | SDK opens a full-screen modal. Card 3DS waits for a final transaction; APM/SPEI hosted instructions may return `Pending` immediately. |

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  presentation_mode: 'embedded',
  events: {
    presentation: {
      on_open: () => showLoadingOverlay(false),
      on_close: () => console.log('Customer closed the hosted view'),
    },
  },
});
```

### Component lifecycle

Everything you create with `tonder.create(...)` — `card_fields` and `apple_pay_button` — holds browser resources: secure iframes for card fields, and a payment session for the Apple Pay button. `unmount()` releases them.

**Whether you have to call it depends on how your checkout navigates, not on which framework you use.** If your page unloads to change checkout state, the browser cleans up for you. If your app changes routes without a page load, you own the cleanup.

| Your checkout                                                                                     | What to do                                                                                     |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The page unloads when the shopper leaves it — classic multi-page checkout, form post, full reload | Nothing. The browser tears the page down for you, so a defensive `unmount()` buys you nothing. |
| Your app changes routes without a page load — any client-side router                              | Call `unmount()` before the checkout view goes away. You own the cleanup.                      |

**What skipping it costs you on a client-side route change.** For Apple Pay, a payment sheet the shopper already opened stays live after you navigate away, and no handle to it survives the route change — nothing can reach it to stop it. If the shopper then authorizes that orphaned sheet, it still charges, using the payment data captured before you left the page. `unmount()` dismisses the sheet and aborts the session. For card fields, `unmount()` releases the secure iframes so your next `mount()` starts from a clean container.

#### Mount and unmount inside a component

Pair each `mount()` with an `unmount()` in your component's cleanup path. The example below uses React's `useEffect`; the same shape applies to `onUnmounted` in Vue, `ngOnDestroy` in Angular, or `onDestroy` in Svelte.

```ts
import { type TonderMountableComponent } from '@tonder.io/web-sdk';

useEffect(() => {
  let cancelled = false;
  let card_fields: TonderMountableComponent | undefined;
  let apple_pay_button: TonderMountableComponent | undefined;

  void (async () => {
    await tonder.init();
    if (cancelled) return;

    card_fields = tonder.create('card_fields');
    await card_fields.mount();
    if (cancelled) return;

    if (tonder.isApplePayAvailable().available) {
      apple_pay_button = tonder.create('apple_pay_button', {
        payment: {
          amount: 150,
          currency: 'MXN',
          return_url: 'https://yourstore.example/checkout/return',
          client_reference: 'order_1001',
        },
      });
      await apple_pay_button.mount();
    }
  })();

  return () => {
    cancelled = true;
    card_fields?.unmount();
    apple_pay_button?.unmount();
  };
}, []);
```

The `cancelled` flag is not optional decoration. `init()` and `mount()` are async, so a shopper who leaves quickly can make them resolve after your component is already gone — without the flag you would mount into a container that no longer exists.
