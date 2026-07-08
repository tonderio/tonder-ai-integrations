# React Integration Pattern

Support either npm or CDN in React apps.

## Loading strategy rule

Ask the user whether to use npm or CDN unless they already specified it. Use npm only when the public package is available or already installed in the project. If npm is unavailable/not published, use the CDN path documented by the Web SDK README. Do not search parent folders and never install `file:../tonder-js` or any sibling workspace package.

When the user selects CDN, add the SDK script in the app HTML entry point (`index.html`) before the React module script. Do **not** dynamically inject the Tonder script from a React component.

```html
<script src="https://zplit-stage.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js"></script>
<script type="module" src="/src/main.jsx"></script>
```

If the React app uses TypeScript and CDN is selected, ask whether the developer wants TypeScript types. If yes, install `@tonder.io/web-sdk` as a devDependency only and use a type-only declaration; runtime still comes from `window.Tonder`:

```bash
npm install -D @tonder.io/web-sdk
```

```ts
import type * as TonderWebSdk from '@tonder.io/web-sdk';

declare global {
  interface Window {
    Tonder: typeof TonderWebSdk;
  }
}
```

Do not import `createTonder` as runtime code from `@tonder.io/web-sdk` when CDN was selected.

## Required secure-field containers

For a full new-card payment, render these SDK container IDs. The SDK mounts secure iframes into these divs; do not create merchant-owned card number, expiry, or CVV inputs.

Do not add merchant-owned labels, borders, padding, or input-like wrappers around these secure-field containers. The SDK renders the field label, input border, placeholder, validation state, and error message inside each secure iframe. Merchant CSS should only control layout around the containers, for example width, max-height, margin, grid, or gap.

Use this container CSS for each secure-field mount point unless the existing app already has equivalent layout styles:

```css
.card-field {
  width: 100%;
  max-height: 90px;
}
```

`customization.card_fields.styles` may style the SDK-rendered secure input, label, error, and icon inside the iframe, including input-level sizing when supported by the SDK renderer. It does not replace the merchant CSS needed to cap the mount container height while the iframe initializes; keep container sizing such as `.card-field { width: 100%; max-height: 90px; }` in merchant CSS.

```jsx
<div id="collect-cardholder-name" className="card-field" />
<div id="collect-card-number" className="card-field" />
<div id="collect-expiration-month" className="card-field" />
<div id="collect-expiration-year" className="card-field" />
<div id="collect-cvv" className="card-field" />
```

## Pattern

- Keep the SDK instance in a `useRef`.
- Initialize in `useEffect` after the component renders the secure-field containers.
- Mount card fields after `init()`.
- Clean up mounted fields when the component unmounts if the SDK element exposes `unmount()`.
- React development builds may run effects twice under `StrictMode`; make setup cancellable and clear the SDK-owned containers before a new mount so secure fields do not duplicate.
- Keep amount, customer, presentation mode, and checkout status in React state.
- Use `status`/`setStatus` only for setup/progress/error copy. Do not introduce generic `result`/`setResult` state or `<p className="result">{result}</p>` for payment output.
- Show payment completion with the alert handoff unless the existing app already has a toast/modal/result system to reuse.
- Do not store raw card data in state.

## CDN sketch

```tsx
import { useEffect, useRef, useState } from 'react';

const CardFieldContainerIds = [
  'collect-cardholder-name',
  'collect-card-number',
  'collect-expiration-month',
  'collect-expiration-year',
  'collect-cvv',
];

function clearCardFieldContainers() {
  CardFieldContainerIds.forEach((id) => document.getElementById(id)?.replaceChildren());
}

export function Checkout() {
  const tonderRef = useRef<any>(null);
  const cardFieldsRef = useRef<any>(null);
  const [amount, setAmount] = useState('150');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Preparing secure card fields...');

  useEffect(() => {
    let disposed = false;
    let mountedTonder: any = null;
    let mountedCardFields: any = null;

    async function setup() {
      const { createTonder } = window.Tonder;
      const tonder = createTonder({
        api_key: 'pk_test_...',
        environment: 'stage',
        presentation_mode: 'embedded',
        session: {
          customer: {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane.doe@example.com',
          },
        },
      });
      mountedTonder = tonder;

      await tonder.init();
      if (disposed) return;

      clearCardFieldContainers();
      const cardFields = tonder.create('card_fields');
      mountedCardFields = cardFields;
      await cardFields.mount();

      if (disposed) {
        await cardFields.unmount?.();
        clearCardFieldContainers();
        return;
      }

      tonderRef.current = tonder;
      cardFieldsRef.current = cardFields;
      setReady(true);
      setStatus('Secure card fields are ready.');
    }

    setup().catch((error) => {
      if (!disposed) window.alert(error.message);
    });

    return () => {
      disposed = true;
      setReady(false);
      void mountedCardFields?.unmount?.();
      clearCardFieldContainers();
      if (cardFieldsRef.current === mountedCardFields) cardFieldsRef.current = null;
      if (tonderRef.current === mountedTonder) tonderRef.current = null;
    };
  }, []);

  async function pay() {
    const transaction = await tonderRef.current.pay({
      amount: Number(amount),
      currency: 'MXN',
      client_reference: `order_${Date.now()}`,
      // Use a stable key for each checkout attempt so retries do not create duplicate charges.
      idempotency_key: `checkout_attempt_${Date.now()}`,
      return_url: window.location.href,
      payment_method: { type: 'card' },
    });

    // Replace this alert with the merchant app's real checkout result UI.
    // Use getTransaction() or your backend/webhooks to reconcile the final
    // status before fulfilling the order.
    window.alert(`Payment status: ${transaction.status}`);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void pay(); }}>
      <input value={amount} onChange={(event) => setAmount(event.target.value)} />
      <div id="collect-cardholder-name" className="card-field" />
      <div id="collect-card-number" className="card-field" />
      <div id="collect-expiration-month" className="card-field" />
      <div id="collect-expiration-year" className="card-field" />
      <div id="collect-cvv" className="card-field" />
      <button type="submit" disabled={!ready}>Deposit</button>
      <p aria-live="polite">{status}</p>
    </form>
  );
}
```

## npm sketch

When npm is selected and the package is available, import `createTonder` from `@tonder.io/web-sdk` instead of reading `window.Tonder`. The rendered secure-field containers and `card_fields` flow stay the same.

## Result UI guidance

The generic recipe uses `window.alert(\`Payment status: ${transaction.status}\`)` as a small handoff point. In a real merchant app, replace it with the app's existing toast/modal/route/state flow. Browser status is shopper feedback only; use `getTransaction()` or backend/webhooks to reconcile the final status before fulfilling the order.
