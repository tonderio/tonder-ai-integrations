## Backend secure token endpoint

`session.secure_token` is required whenever the SDK needs to create, read, update, or remove stored card records for a customer. In practice, this means:

| SDK operation                                         | Needs `session.secure_token`?                      | Why                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `tonder.enrollCard()`                                 | Yes                                                | Saves a new card for the customer.                                                       |
| `tonder.getCustomerCards()`                           | Yes                                                | Lists the customer's saved cards.                                                        |
| `tonder.removeCustomerCard(card_id)`                  | Yes                                                | Removes a saved card.                                                                    |
| `tonder.pay()` with `{ type: 'saved_card', card_id }` | Yes                                                | Looks up the saved card and may update it with CVV/Card-on-File data before charging it. |
| `tonder.pay()` with `{ type: 'card' }`                | Only when Card on File is enabled for the business | Saves the new card and creates/updates the Card-on-File subscription before charging it. |

Create the token on your backend using your Tonder **secret API key**, then return only the short-lived `access` token to the browser. Never expose your secret key in frontend code.

```ts
// Example backend route. Keep TONDER_SECRET_API_KEY only on your server.
app.post('/api/tonder/secure-token', async (_req, res) => {
  const response = await fetch('https://stage.tonder.io/api/secure-token/', {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.TONDER_SECRET_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    res.status(502).json({ error: 'Unable to create Tonder secure token' });
    return;
  }

  const { access } = await response.json();
  res.json({ secure_token: access });
});
```

Use the matching Tonder API host for your environment:

| SDK environment      | Backend token URL                           |
| -------------------- | ------------------------------------------- |
| `sandbox` or `stage` | `https://stage.tonder.io/api/secure-token/` |
| `production`         | `https://app.tonder.io/api/secure-token/`   |

Then pass the value returned by your backend to the SDK:

```ts
const { secure_token } = await fetch('/api/tonder/secure-token', {
  method: 'POST',
}).then((response) => response.json());

const tonder = createTonder({
  api_key: 'pk_test_...',
  environment: 'sandbox',
  session: {
    customer: { email: 'ada@example.com' },
    secure_token,
  },
});
```
