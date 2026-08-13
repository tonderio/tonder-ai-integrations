# Apple Pay Integration Pattern

Apple Pay is a **mountable SDK component**, not a `pay()` method. The SDK renders the button and owns the click, so there is no promise to await and no return value to read. `tonder.pay({ payment_method: { type: 'apple_pay' } })` is rejected on purpose.

## How it differs from every other flow

| Every other flow | Apple Pay |
| ---------------- | --------- |
| Merchant renders a button and calls `tonder.pay(...)` | SDK renders the button and handles the tap |
| Result is the awaited return value of `pay()` | Result arrives on `config.events.payment` |
| Merchant decides when to show the option | Render only when `isApplePayAvailable().available` is `true` |
| Nothing to release on teardown | `unmount()` is required on client-side route changes |

## Required order

1. `createTonder({ ..., events: { payment: { on_completed, on_error, on_cancel } } })`
2. `await tonder.init()`
3. `const availability = tonder.isApplePayAvailable()`
4. Render the container and `mount()` only when `availability.available` is `true`
5. `unmount()` when the checkout view is destroyed

## Availability check

`isApplePayAvailable()` returns an **object**, never a bare boolean:

```ts
type ApplePayAvailability =
  | { available: true }
  | { available: false; code: string; message: string };
```

`if (tonder.isApplePayAvailable())` is always truthy and is a bug. Read `.available`.

Log `code` when it is `false`; the three reasons need three different responses:

| `code` | Meaning | What the merchant should do |
| ------ | ------- | --------------------------- |
| `NOT_INITIALIZED` | `init()` has not finished | Sequencing bug in the integration; await `init()` first |
| `APPLE_PAY_UNSUPPORTED_BROWSER` | This browser cannot run Apple Pay | Hide the button and offer another payment method |
| `APPLE_PAY_NOT_ENABLED` | Apple Pay is not enabled for the business | No code change helps; contact Tonder |

`available: true` means "render the button". It does not promise the payment sheet will open; handle everything after the tap through `events.payment`.

## Container

The SDK mounts into a merchant-supplied container. The default selector is `#tonder-apple-pay-button`; pass `container_id` to use a different one.

```html
<div id="tonder-apple-pay-button"></div>
```

Do not render merchant-owned button markup, label text, or icons inside the container. The SDK renders the Apple-compliant button. Merchant CSS may control layout around the container only.

Style the button through `customization.apple_pay_button` on `createTonder()`. These six fields are the whole surface — Apple permits four changes (call to action, color, size, corner radius) plus the label's language, and Safari draws the control natively, so any other CSS property is dropped without an error.

Every field has a default and each one falls back on its own, so pass only what you want to change. Omit `customization.apple_pay_button` entirely and the button renders `check-out` / `black` / `en` / `100%` / `48px` / `8px`:

```ts
customization: {
  apple_pay_button: {
    type: 'check-out',        // buy | donate | plain | set-up | book | check-out |
                              // subscribe | add-money | contribute | order | reload |
                              // rent | support | tip | top-up | continue
    style: 'black',           // black | white | white-outline
    locale: 'es-MX',          // BCP 47; defaults to 'en', so set it to serve
                              // shoppers in another language
    width: '100%',            // min 100pt for `plain`, 140pt otherwise
    height: '48px',           // min 30pt
    border_radius: '8px',     // single value
  },
}
```

## Payment data: object or synchronous function

```ts
const button = tonder.create('apple_pay_button', {
  payment: () => ({
    amount: cart.total,
    currency: 'MXN',
    return_url: window.location.href,
    client_reference: cart.orderId,
    // Use a stable key for each checkout attempt so retries do not create duplicate charges.
    idempotency_key: cart.idempotencyKey,
  }),
});
```

- Pass an **object** when the amount is fixed at mount time.
- Pass a **function** when the cart can change after mount. The SDK calls it at the moment of the tap, so amount, currency, and references can change without remounting.
- **The function must be synchronous.** Apple requires the sheet to open in the same tick as the tap, so an `async` function or anything that awaits a network call will not work. If server-side data is needed, fetch it before the shopper taps and read it from a variable inside the function.
- `ApplePayPaymentInput` accepts `amount`, `currency`, `return_url`, `client_reference`, `idempotency_key`, `metadata`, and `billing_address`. It does not accept `payment_method`; the button already is one.

## Results

There is nothing to await. Every outcome arrives on `config.events.payment`:

| Outcome | Callback |
| ------- | -------- |
| Charge reached a final state, **including a decline** | `on_completed(transaction)` |
| Operational failure with no transaction | `on_error(error)` |
| Shopper dismissed the sheet | `on_cancel()` |

`on_completed` does not mean approved. Branch on `transaction.status` before showing success, and reconcile fulfillment from the merchant backend through webhooks or server-side transaction lookup.

Cancelling is not an error. Do not show an error message from `on_cancel`.

These callbacks belong to the whole SDK instance, so `pay()` fires them too. One set of handlers covers every payment method the merchant offers.

After a settled attempt, mint a fresh `client_reference` and `idempotency_key` so the next tap is a new order with its own idempotency scope.

## Teardown

```ts
button.unmount();
```

Call it when the checkout view is destroyed. On a client-side route change this is required, not optional: an Apple Pay sheet left open after navigation can still be authorized and will charge with the payment data captured before the route changed, and no handle survives the navigation to stop it. `unmount()` dismisses the sheet and aborts the session. It is safe to call more than once.

## Merchant prerequisites

- Apple Pay must be enabled for the business in Tonder. When it is not, `isApplePayAvailable()` returns `APPLE_PAY_NOT_ENABLED` and no code change will fix it.
- Apple Pay on the Web is an Apple platform feature: Apple requires the domain serving the button to be registered and verified with Apple before the payment sheet can open. This is a merchant/Tonder onboarding step, not an SDK option, and it is the most likely production-only failure. It surfaces after the tap as `APPLE_PAY_VALIDATION_ERROR` on `on_error`, not as an availability code — so a merchant can pass every availability check, render a correct button, and still fail on the first real tap. Verification is done by hosting a file Tonder provides at `/.well-known/apple-developer-merchantid-domain-association.txt`; the SDK README documents the steps and the three details that most often go wrong. Confirm registration before going live, and remember every subdomain is a separate registration.
- The page must be served over HTTPS from the registered domain, at the top level. Apple Pay does not run inside an iframe that lacks payment permission, so preview sandboxes and embedded playgrounds will fail even when the integration is correct.

## HTML sketch

```html
<div id="tonder-apple-pay-button"></div>

<script>
  window.__TONDER_CONFIG__ = {
    publicApiKey: 'REPLACE_WITH_PUBLIC_TONDER_API_KEY',
    environment: 'stage'
  };
</script>
<script src="https://zplit-stage.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js"></script>
<script type="module">
  const { createTonder } = window.Tonder;
  const tonderConfig = window.__TONDER_CONFIG__;

  let clientReference = `order_${Date.now()}`;
  // Use a stable key for each checkout attempt so retries do not create duplicate charges.
  let idempotencyKey = `checkout_attempt_${Date.now()}`;

  const tonder = createTonder({
    api_key: tonderConfig.publicApiKey,
    environment: tonderConfig.environment,
    session: {
      customer: {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com'
      }
    },
    events: {
      payment: {
        on_completed: (transaction) => {
          // A decline arrives here too. Replace this alert with the merchant
          // app's real checkout result UI, and reconcile the final status from
          // the backend or webhooks before fulfilling the order.
          window.alert(`Payment status: ${transaction.status}`);
          clientReference = `order_${Date.now()}`;
          idempotencyKey = `checkout_attempt_${Date.now()}`;
        },
        on_error: (error) => console.error(error.code, error.message),
        on_cancel: () => console.info('Shopper dismissed the payment sheet')
      }
    }
  });

  let teardownCheckout = () => {};

  async function start() {
    await tonder.init();

    const availability = tonder.isApplePayAvailable();
    if (!availability.available) {
      // Hide the container and offer another method. Do not guess the reason.
      console.info('Apple Pay hidden:', availability.code, availability.message);
      document.querySelector('#tonder-apple-pay-button').hidden = true;
      return;
    }

    const button = tonder.create('apple_pay_button', {
      payment: () => ({
        amount: 150,
        currency: 'MXN',
        return_url: window.location.href,
        client_reference: clientReference,
        idempotency_key: idempotencyKey
      })
    });

    await button.mount();
    teardownCheckout = () => button.unmount();
  }

  start();
  window.addEventListener('pagehide', () => teardownCheckout());
</script>
```

## React sketch

The payment callback is created once per mount but must read the **current** cart, so read it from a ref rather than closing over state.

```tsx
import { useEffect, useRef, useState } from 'react';

interface ApplePayButtonHandle {
  mount: () => Promise<void>;
  unmount: () => void;
}

export function ApplePayCheckout() {
  const [amount, setAmount] = useState('150');
  const [status, setStatus] = useState('Loading Apple Pay...');
  const [available, setAvailable] = useState(false);

  // Read at TAP time, so these change freely without remounting the button.
  const payment = useRef({ amount, clientReference: '', idempotencyKey: '' });
  payment.current = {
    amount,
    clientReference: payment.current.clientReference || `order_${Date.now()}`,
    // Use a stable key for each checkout attempt so retries do not create duplicate charges.
    idempotencyKey: payment.current.idempotencyKey || `checkout_attempt_${Date.now()}`,
  };

  useEffect(() => {
    let cancelled = false;
    let button: ApplePayButtonHandle | null = null;

    async function start() {
      const { createTonder } = window.Tonder;
      const tonder = createTonder({
        api_key: import.meta.env.VITE_TONDER_PUBLIC_API_KEY,
        environment: import.meta.env.VITE_TONDER_ENVIRONMENT,
        session: {
          customer: { first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com' },
        },
        events: {
          payment: {
            on_completed: (transaction) => {
              // A decline arrives here too. Replace this alert with the merchant
              // app's real checkout result UI; reconcile the final status from
              // the backend or webhooks before fulfilling the order.
              window.alert(`Payment status: ${transaction.status}`);
              payment.current.clientReference = `order_${Date.now()}`;
              payment.current.idempotencyKey = `checkout_attempt_${Date.now()}`;
            },
            on_error: (error) => setStatus(`${error.code}: ${error.message}`),
            on_cancel: () => setStatus('Payment sheet dismissed.'),
          },
        },
      });

      await tonder.init();
      if (cancelled) return;

      const availability = tonder.isApplePayAvailable();
      if (!availability.available) {
        setAvailable(false);
        setStatus(`Apple Pay unavailable: ${availability.code}`);
        return;
      }

      button = tonder.create('apple_pay_button', {
        // Synchronous on purpose: Apple requires the sheet to open in the same
        // tick as the tap, so this must not be async.
        payment: () => ({
          amount: Number(payment.current.amount),
          currency: 'MXN',
          return_url: window.location.href,
          client_reference: payment.current.clientReference,
          idempotency_key: payment.current.idempotencyKey,
        }),
      });

      setAvailable(true);
      await button.mount();
      if (cancelled) {
        button.unmount();
        button = null;
        return;
      }
      setStatus('Tap the Apple Pay button to open the payment sheet.');
    }

    start().catch((error) => {
      if (!cancelled) setStatus(error.message);
    });

    return () => {
      cancelled = true;
      // Required on route changes: an orphaned sheet can still be authorized
      // and charge with stale payment data.
      button?.unmount();
      button = null;
    };
  }, []);

  return (
    <section>
      <input value={amount} onChange={(event) => setAmount(event.target.value)} />
      {available && <div id="tonder-apple-pay-button" />}
      <p aria-live="polite">{status}</p>
    </section>
  );
}
```

For Next.js Client Components, use `process.env.NEXT_PUBLIC_TONDER_PUBLIC_API_KEY` and `process.env.NEXT_PUBLIC_TONDER_ENVIRONMENT` instead of `import.meta.env`.

Under React `StrictMode`, development builds run effects twice. The cleanup above already unmounts before the second run, so no orphaned button survives.

## Angular sketch

```ts
import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-apple-pay-checkout',
  template: `
    @if (available()) {
      <div id="tonder-apple-pay-button"></div>
    }
    <p aria-live="polite">{{ status() }}</p>
  `
})
export class ApplePayCheckoutComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private button: any;

  readonly available = signal(false);
  readonly status = signal('Loading Apple Pay...');

  private amount = 150;
  private clientReference = `order_${Date.now()}`;
  // Use a stable key for each checkout attempt so retries do not create duplicate charges.
  private idempotencyKey = `checkout_attempt_${Date.now()}`;

  private readonly tonder = window.Tonder.createTonder({
    api_key: environment.tonderPublicApiKey,
    environment: environment.tonderEnvironment,
    session: {
      customer: { first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com' }
    },
    events: {
      payment: {
        on_completed: (transaction: any) => {
          // A decline arrives here too. Replace this alert with the app's real
          // checkout result UI; reconcile the final status from the backend or
          // webhooks before fulfilling the order.
          window.alert(`Payment status: ${transaction.status}`);
          this.clientReference = `order_${Date.now()}`;
          this.idempotencyKey = `checkout_attempt_${Date.now()}`;
          this.cdr.detectChanges();
        },
        on_error: (error: any) => {
          this.status.set(`${error.code}: ${error.message}`);
          this.cdr.detectChanges();
        },
        on_cancel: () => {
          this.status.set('Payment sheet dismissed.');
          this.cdr.detectChanges();
        }
      }
    }
  });

  async ngAfterViewInit() {
    await this.tonder.init();

    const availability = this.tonder.isApplePayAvailable();
    if (!availability.available) {
      this.status.set(`Apple Pay unavailable: ${availability.code}`);
      return;
    }

    this.available.set(true);
    this.cdr.detectChanges();

    this.button = this.tonder.create('apple_pay_button', {
      // Synchronous on purpose: Apple requires the sheet to open in the same
      // tick as the tap, so this must not be async.
      payment: () => ({
        amount: this.amount,
        currency: 'MXN',
        return_url: window.location.href,
        client_reference: this.clientReference,
        idempotency_key: this.idempotencyKey
      })
    });

    await this.button.mount();
    this.status.set('Tap the Apple Pay button to open the payment sheet.');

    // Required on route changes: an orphaned sheet can still be authorized and
    // charge with stale payment data.
    this.destroyRef.onDestroy(() => this.button?.unmount());
  }
}
```

The container must exist in the DOM before `mount()` runs. When the container is behind a control-flow block, set the availability flag and let change detection commit before mounting; otherwise `mount()` throws `APPLE_PAY_CONTAINER_NOT_FOUND`.

## Validation checklist additions

- `isApplePayAvailable()` is read as an object through `.available`, not used as a bare boolean.
- The Apple Pay container is only rendered when `available` is `true`.
- The `payment` function is synchronous and contains no `await`.
- `client_reference` and `idempotency_key` are present, and fresh values are minted after each settled attempt.
- Results are handled through `events.payment`, not from a return value; nothing awaits the button.
- `on_completed` branches on `transaction.status` and does not treat completion as approval.
- `on_cancel` does not render an error.
- `unmount()` runs on component destroy or route change.
- No merchant-owned Apple Pay button markup, label, or icon is rendered inside the container.
- The developer was told that Apple Pay must be enabled by Tonder and that the production domain must be registered with Apple.
