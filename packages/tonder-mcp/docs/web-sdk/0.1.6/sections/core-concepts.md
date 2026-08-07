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

**Read `subscription_id` on every saved card before charging it.** It decides whether you need to collect a CVV:

| `subscription_id` | What to do before `pay()`                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| present           | Nothing. Charge the card directly.                                                                |
| `null`            | Mount the saved-card CVV field. The SDK uses it to create the subscription as part of the charge. |

Card on File is what makes that field appear: it lets a business store a shopper's card and charge it later through a processor-backed subscription. Ask the Tonder team whether it is enabled for your business before building saved-card flows — when it is off, `subscription_id` is always `null`.

Which operations need `session.secure_token`, and why, is listed once in [Backend secure token endpoint](#backend-secure-token-endpoint).

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
