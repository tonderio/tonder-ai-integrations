## Webhooks

Webhooks are server-to-server notifications from Tonder to your backend. Use them as the source of truth for post-payment events and fulfillment, especially when the shopper leaves the browser flow or the payment completes asynchronously.

Use webhooks when:

- A payment can complete after the shopper leaves your page.
- You use asynchronous methods such as SPEI, OXXO, SafetyPay, or Mercado Pago.
- You need reliable order fulfillment, inventory release, receipts, or ledger updates.
- You need to reconcile `Pending` transactions after redirect/hosted-payment flows.

Tonder webhooks use a flat payload: fields are at the top level, not wrapped in a nested `data` object. Common payment fields include:

| Field                 | Type   | Description                                                                                                                                         |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | string | **The transaction's id** — the same one `pay()` returns and `getTransaction()` takes. Not unique per event: every event for one payment carries it. |
| `operation_type`      | string | Operation type, usually `payment` for this SDK.                                                                                                     |
| `amount`              | string | Transaction amount as sent by the webhook event.                                                                                                    |
| `currency`            | string | ISO currency code, for example `MXN`.                                                                                                               |
| `client_reference`    | string | Your own order/reference identifier.                                                                                                                |
| `status`              | string | Current transaction status. See [Payment statuses](#payment-statuses).                                                                              |
| `provider`            | string | The provider that processed the transaction.                                                                                                        |
| `transaction_id`      | string | A Tonder-internal id for the processing record. Quote it to support; do not correlate your orders on it.                                            |
| `payment_method_type` | string | Payment method used, for example `CARD`, `SPEI`, or `OXXO`.                                                                                         |
| `created`             | string | ISO timestamp for the event.                                                                                                                        |
| `metadata`            | object | Metadata you passed when creating the payment.                                                                                                      |
| `event_type`          | string | `<operation_type>_<status>`, for example `payment_Success` or `payment_Pending`. This is what changes between events for the same payment.          |
| `action`              | string | Event action, for example `MODIFY`.                                                                                                                 |

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
- Respond within 30 seconds — that is the delivery timeout, not a suggestion.
- Return any `2xx` status to acknowledge receipt. Anything else counts as a failure.
- Make processing idempotent, but **do not deduplicate on `id` alone**. One payment emits several events — a `Pending` then a `Success`, say — and they all carry the same `id`. Key on `id` together with `status`, or you will drop the event that says the money arrived.

**Delivery is retried, but not forever.** Tonder attempts each event up to three times, 60 seconds apart. An event that fails all three goes to a dead-letter queue and is kept for 30 days for manual reprocessing — so an endpoint that is down for an hour does not lose the payment, but it does mean your own reconciliation has to close the gap rather than waiting for a delivery that is no longer coming. `getTransaction()` is how you close it.

Webhook setup, delivery details, and the full event catalog live in the Tonder API docs: [How webhooks work](https://docs.tonder.io/direct-integration/webhooks/how-webhooks-works). The payload above is the same one Direct API sends — the SDK does not add a wrapper or a separate event stream, so a merchant already consuming Tonder webhooks server-to-server keeps the exact same handler.
