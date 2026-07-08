# Angular Integration Pattern

Support either npm or CDN in Angular apps.

## Loading strategy rule

Ask the user whether to use npm or CDN unless they already specified it. Use npm only when the public package is available or already installed in the project. If npm is unavailable/not published, use the CDN path documented by the Web SDK README. Do not search parent folders and never install `file:../tonder-js` or any sibling workspace package.

When the user selects CDN, add the SDK script in `src/index.html` before Angular boots. Do **not** dynamically inject the Tonder script from an Angular component or service.

```html
<script src="https://zplit-stage.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js"></script>
<script type="module" src="/src/main.ts"></script>
```

If the Angular app uses TypeScript and CDN is selected, ask whether the developer wants TypeScript types. If yes, install `@tonder.io/web-sdk` as a devDependency only and use a type-only declaration; runtime still comes from `window.Tonder`:

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

## Pattern

- Initialize the SDK in a component or injectable checkout service.
- Mount secure fields after the view exists.
- Use `DestroyRef` or `ngOnDestroy` for cleanup.
- Keep UI state in Angular state/signals/forms.
- Do not bind raw card data to Angular forms.
- Angular change detection note: when using the CDN/global SDK, SDK promises and hosted-payment callbacks can resolve outside Angular change detection. Prefer Angular `signal()` state for `ready` and `submitting`. If using class properties, call `ChangeDetectorRef.detectChanges()` after state updates. `NgZone.run(...)` alone is not sufficient in zoneless Angular apps.

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

```html
<div id="collect-cardholder-name" class="card-field"></div>
<div id="collect-card-number" class="card-field"></div>
<div id="collect-expiration-month" class="card-field"></div>
<div id="collect-expiration-year" class="card-field"></div>
<div id="collect-cvv" class="card-field"></div>
```

## Sketch

```ts
import { AfterViewInit, Component, DestroyRef, inject } from '@angular/core';

@Component({
  selector: 'app-checkout',
  template: `
    <div id="collect-cardholder-name" class="card-field"></div>
    <div id="collect-card-number" class="card-field"></div>
    <div id="collect-expiration-month" class="card-field"></div>
    <div id="collect-expiration-year" class="card-field"></div>
    <div id="collect-cvv" class="card-field"></div>
    <button type="button" (click)="pay()">Pay</button>
  `
})
export class CheckoutComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private tonder = window.Tonder.createTonder({
    api_key: 'pk_test_...',
    environment: 'stage',
    presentation_mode: 'embedded',
    session: {
      customer: {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com'
      }
    }
  });
  private cardFields: any;

  async ngAfterViewInit() {
    await this.tonder.init();
    this.cardFields = this.tonder.create('card_fields');
    await this.cardFields.mount();
    this.destroyRef.onDestroy(() => this.cardFields?.unmount?.());
  }

  async pay() {
    const transaction = await this.tonder.pay({
      amount: 150,
      currency: 'MXN',
      client_reference: 'order_123',
      // Use a stable key for each checkout attempt so retries do not create duplicate charges.
      idempotency_key: `checkout_attempt_${Date.now()}`,
      return_url: window.location.href,
      payment_method: { type: 'card' }
    });

    // Replace this alert with the merchant app's real checkout result UI.
    // Use getTransaction() or your backend/webhooks to reconcile the final
    // status before fulfilling the order.
    window.alert(`Payment status: ${transaction.status}`);
  }
}
```

## Result UI guidance

The generic recipe uses `window.alert(\`Payment status: ${transaction.status}\`)` as a small handoff point. In a real merchant app, replace it with the app's existing toast/modal/route/state flow. Browser status is shopper feedback only; use `getTransaction()` or backend/webhooks to reconcile the final status before fulfilling the order.
