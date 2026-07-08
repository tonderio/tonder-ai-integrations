## Payment statuses

Read payment state from `transaction.status`.

| Status       | Meaning                                                                            | What to do                                                           |
| ------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Success`    | Payment completed.                                                                 | Confirm the order.                                                   |
| `Authorized` | Payment was authorized by the processor path.                                      | Continue according to your Tonder setup and reconcile with webhooks. |
| `Pending`    | Payment is not final yet. Common for redirect 3DS and asynchronous APM/SPEI flows. | Wait for webhook confirmation or read later with `getTransaction()`. |
| `Processing` | Payment is still being processed by the provider.                                  | Do not fulfill yet; wait for webhook or query again later.           |
| `Declined`   | Issuer/processor declined the payment.                                             | Show a recoverable payment message.                                  |
| `Failed`     | Payment failed.                                                                    | Show a recoverable payment message or ask for another method.        |
| `Cancelled`  | Payment was cancelled or voided.                                                   | Do not fulfill; let the shopper start a new payment if needed.       |
| `Expired`    | Payment was not completed in time.                                                 | Ask the customer to start a new payment.                             |
