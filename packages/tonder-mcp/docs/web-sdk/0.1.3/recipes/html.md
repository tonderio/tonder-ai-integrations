# HTML Integration Pattern

Use the CDN artifact for plain HTML pages.

## Script loading

Add the browser SDK script before integration code:

```html
<script src="https://zplit-stage.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js"></script>
<script type="module" src="/index.js"></script>
```

Use the production CDN URL when the user is integrating production. Keep deployment-specific values outside the integration code: inject the public API key, SDK environment, and environment-specific CDN URL from the page template, a public runtime config object, or another merchant-approved configuration source.

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

## Public configuration

For plain HTML, read deployment-specific values from merchant-owned public runtime configuration. For example, render `window.__TONDER_CONFIG__` from the server or from a static config file generated per environment. Do not commit a real merchant public API key or fixed SDK environment directly in the integration code.

```html
<script>
  window.__TONDER_CONFIG__ = {
    publicApiKey: 'REPLACE_WITH_PUBLIC_TONDER_API_KEY',
    environment: 'stage'
  };
</script>
```

## Pattern

```html
<div id="collect-cardholder-name" class="card-field"></div>
<div id="collect-card-number" class="card-field"></div>
<div id="collect-expiration-month" class="card-field"></div>
<div id="collect-expiration-year" class="card-field"></div>
<div id="collect-cvv" class="card-field"></div>
<button id="pay-button">Deposit</button>

<script>
  const { createTonder } = window.Tonder;
  const tonderConfig = window.__TONDER_CONFIG__;

  const tonder = createTonder({
    api_key: tonderConfig.publicApiKey,
    environment: tonderConfig.environment,
    presentation_mode: 'embedded',
    session: {
      customer: {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com'
      }
    }
  });

  async function start() {
    await tonder.init();
    const cardFields = tonder.create('card_fields');
    await cardFields.mount();

    document.querySelector('#pay-button').addEventListener('click', async () => {
      const transaction = await tonder.pay({
        amount: 150,
        currency: 'MXN',
        return_url: window.location.href,
        client_reference: `order_${Date.now()}`,
        // Use a stable key for each checkout attempt so retries do not create duplicate charges.
        idempotency_key: `checkout_attempt_${Date.now()}`,
        payment_method: { type: 'card' },
      });

      // Replace this alert with the merchant app's real checkout result UI.
      // Use getTransaction() or your backend/webhooks to reconcile the final
      // status before fulfilling the order.
      window.alert(`Payment status: ${transaction.status}`);
    });
  }

  start();
</script>
```

Use `tonder.pay(...)` or `tonder.enrollCard(...)` according to the selected flow.

## Result UI guidance

The generic recipe uses `window.alert(\`Payment status: ${transaction.status}\`)` as a small handoff point. In a real merchant app, replace it with the app's existing toast/modal/route/state flow. Browser status is shopper feedback only; use `getTransaction()` or backend/webhooks to reconcile the final status before fulfilling the order.
