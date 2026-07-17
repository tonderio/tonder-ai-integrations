## Webhooks

Webhooks are server-to-server notifications from Tonder to your backend. Use them as the source of truth for post-payment events and fulfillment, especially when the shopper leaves the browser flow or the payment completes asynchronously.

Use webhooks when:

- A payment can complete after the shopper leaves your page.
- You use asynchronous methods such as SPEI, OXXO, SafetyPay, or Mercado Pago.
- You need reliable order fulfillment, inventory release, receipts, or ledger updates.
- You need to reconcile `Pending` transactions after redirect/hosted-payment flows.

Tonder webhooks use a flat payload: fields are at the top level, not wrapped in a nested `data` object. Common payment fields include:

| Field                 | Type   | Description                                                            |
| --------------------- | ------ | ---------------------------------------------------------------------- |
| `id`                  | string | Unique webhook event identifier.                                       |
| `operation_type`      | string | Operation type, usually `payment` for this SDK.                        |
| `amount`              | string | Transaction amount as sent by the webhook event.                       |
| `currency`            | string | ISO currency code, for example `MXN`.                                  |
| `client_reference`    | string | Your own order/reference identifier.                                   |
| `status`              | string | Current transaction status. See [Payment statuses](#payment-statuses). |
| `provider`            | string | Payment provider/acquirer that processed the transaction.              |
| `transaction_id`      | string | Tonder transaction identifier.                                         |
| `payment_method_type` | string | Payment method used, for example `CARD`, `SPEI`, or `OXXO`.            |
| `created`             | string | ISO timestamp for the event.                                           |
| `metadata`            | object | Metadata you passed when creating the payment.                         |
| `event_type`          | string | Event name, for example `payment_Success` or `payment_Pending`.        |
| `action`              | string | Event action, for example `MODIFY`.                                    |

Example `payment_Success` event:

```json
{
  "id": "fc38522e-3e5d-45b8-ba6a-ece72caee71f",
  "operation_type": "payment",
  "amount": "70",
  "currency": "MXN",
  "client_reference": "order_1001",
  "status": "Success",
  "provider": "tonder",
  "transaction_id": "e9340a04-6d68-4afc-86c5-79f8b7c87de4",
  "payment_method_type": "SPEI",
  "created": "2026-05-21T19:15:32.029134Z",
  "metadata": {
    "cart_id": "cart_789"
  },
  "event_type": "payment_Success",
  "action": "MODIFY"
}
```

Webhook endpoint checklist:

- Use a publicly reachable HTTPS URL.
- Verify the request comes from Tonder according to your account configuration.
- Respond within 30 seconds.
- Return any `2xx` status to acknowledge receipt.
- Make processing idempotent by storing processed event IDs.

For setup, retry behavior, and delivery details, see [How webhooks work](https://docs.tonder.io/direct-integration/webhooks/how-webhooks-works).
