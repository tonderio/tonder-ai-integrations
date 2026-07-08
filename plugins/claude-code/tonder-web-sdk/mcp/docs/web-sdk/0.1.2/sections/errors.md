## Errors

SDK failures are thrown as `AppError`. Payment declines are returned as transactions; read `transaction.status` and use the [Payment statuses](#payment-statuses) table to decide the next action.

```ts
import { AppError, ErrorKeyEnum } from '@tonder.io/web-sdk';

try {
  const transaction = await tonder.pay({
    amount: 150,
    currency: 'MXN',
    return_url: 'https://yourstore.example/checkout/return',
    client_reference: 'order_1001',
    payment_method: { type: 'card' },
  });
} catch (error) {
  if (error instanceof AppError) {
    console.error(error.code, error.status_code, error.details.system_error);

    if (error.code === ErrorKeyEnum.MISSING_CUSTOMER) {
      // Recreate the SDK with session.customer.
    }
  } else {
    throw error;
  }
}
```

Example error shape:

```json
{
  "name": "TonderError",
  "status": "error",
  "code": "INVALID_PAYMENT_REQUEST",
  "status_code": 500,
  "details": {
    "code": "INVALID_PAYMENT_REQUEST",
    "status_code": 500,
    "system_error": "input.amount must be greater than 0."
  }
}
```

Common error codes:

Use `error.code` for branching. Do not parse `error.message`; messages are for display/logging and may change.

### Configuration and SDK lifecycle

| Code                       | When it happens                                                      | Returned by                                                                                              | How to fix                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INIT_ERROR`               | SDK initialization failed after the instance was created.            | `tonder.init()`                                                                                          | Check the publishable `api_key`, `environment`, and network access to Tonder services.                                                                 |
| `FETCH_BUSINESS_ERROR`     | Merchant/business configuration could not be loaded.                 | `tonder.init()`, operations that require initialization                                                  | Verify the publishable key and environment.                                                                                                            |
| `NOT_INITIALIZED`          | A method needs initialized SDK state but `init()` has not completed. | `card_fields.mount()`, `card_fields.reveal()`, `tonder.pay()`, `tonder.enrollCard()`, saved-card methods | Call `await tonder.init()` before the operation. Read-only methods such as `getTransaction()` and payment-method catalog methods do not need `init()`. |
| `INVALID_COMPONENT_TYPE`   | The requested UI component is not supported.                         | `tonder.create()`                                                                                        | Use `tonder.create('card_fields', options)`.                                                                                                           |
| `SECURE_FIELDS_LOAD_ERROR` | The browser could not load the secure card-fields library.           | `card_fields.mount()`, `card_fields.reveal()`                                                            | Check CSP, ad blockers, network access, and the page environment.                                                                                      |
| `ACQUIRER_LOAD_ERROR`      | The Card-on-File acquirer library could not load.                    | `tonder.enrollCard()`, `tonder.pay()` when COF is needed                                                 | Check network/CSP and retry.                                                                                                                           |

### Customer and saved-card credentials

| Code                       | When it happens                                                      | Returned by                                                                                                                                | How to fix                                                                                        |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `MISSING_CUSTOMER`         | `session.customer` is required but was not provided.                 | `tonder.pay()`, `tonder.enrollCard()`, `tonder.getCustomerCards()`, `tonder.removeCustomerCard()`                                          | Create the SDK with `session.customer.email` and optional customer fields.                        |
| `SECURE_TOKEN_REQUIRED`    | Saved-card operations require `session.secure_token`.                | `tonder.enrollCard()`, `tonder.getCustomerCards()`, `tonder.removeCustomerCard()`, `tonder.pay()` with `payment_method.type: 'saved_card'` | Mint a secure token on your backend and pass it in `createTonder({ session: { secure_token } })`. |
| `CUSTOMER_OPERATION_ERROR` | Customer registration/fetch failed.                                  | Saved-card operations and card enrollment                                                                                                  | Verify customer data and backend availability.                                                    |
| `FETCH_CARDS_ERROR`        | Saved cards could not be retrieved.                                  | `tonder.getCustomerCards()`, saved-card `pay()` lookup                                                                                     | Verify `session.customer`, `session.secure_token`, and customer ownership.                        |
| `SAVE_CARD_ERROR`          | A new or existing card could not be saved.                           | `tonder.enrollCard()`, `tonder.pay()` when a card must be saved for COF                                                                    | Ask the shopper to verify card data or retry; inspect `error.details` for backend context.        |
| `REMOVE_CARD_ERROR`        | A saved card could not be removed.                                   | `tonder.removeCustomerCard()`, rollback after failed auto-enrollment                                                                       | Retry the removal or reconcile from your backend/admin tools.                                     |
| `CARD_ON_FILE_DECLINED`    | Card-on-File enrollment/authorization was declined by the processor. | `tonder.enrollCard()`, COF/saved-card `tonder.pay()` flows                                                                                 | Ask for another card or corrected card details.                                                   |

### Payment request and processing

| Code                              | When it happens                                                                                                                                              | Returned by                                                              | How to fix                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_PAYMENT_REQUEST`         | Required payment fields are missing or invalid (`amount`, `return_url`, `client_reference`, `payment_method`, saved-card `card_id`, etc.).                   | `tonder.pay()`                                                           | Validate the request before calling `pay()`.                                                                                                        |
| `INVALID_PAYMENT_REQUEST_CARD_PM` | A card payment path received a non-card method.                                                                                                              | `tonder.pay()`                                                           | Use `{ type: 'card' }` for new-card payments or a supported APM code for alternative methods.                                                       |
| `INVALID_APM_CONFIG`              | `safetypayCash` or `safetypayTransfer` is missing required config.                                                                                           | `tonder.pay()`                                                           | Pass `payment_method.config.country`, `payment_method.config.channel`, and `payment_method.config.bank_ids` using the selected `PaymentMethodBank`. |
| `MOUNT_COLLECT_ERROR`             | Secure fields could not mount or collect valid card data.                                                                                                    | `card_fields.mount()`, `tonder.pay()`, `tonder.enrollCard()`             | Ensure all field containers exist and the shopper completed valid card fields.                                                                      |
| `PAYMENT_PROCESS_ERROR`           | Tonder could not create/process the payment or the transport failed. Declined payments returned by Tonder are not thrown; they are returned as transactions. | `tonder.pay()`                                                           | Inspect `error.details` and reconcile with your backend logs. Retry only when safe/idempotent.                                                      |
| `FETCH_TRANSACTION_ERROR`         | Transaction lookup failed.                                                                                                                                   | `tonder.getTransaction()`, embedded 3DS reconciliation in `tonder.pay()` | Verify the transaction id and retry from backend/webhook records.                                                                                   |
| `REQUEST_ABORTED`                 | A request or embedded hosted-payment wait was canceled.                                                                                                      | `tonder.pay()`, `tonder.getTransaction()`                                | Treat as an interrupted client flow and reconcile from backend/webhooks.                                                                            |
| `REQUEST_FAILED`                  | A low-level network/HTTP request failed before it could be mapped to a more specific operation.                                                              | Browser/network-dependent operations                                     | Check connectivity, CORS/CSP, and API availability.                                                                                                 |
| `POLL_TIMEOUT_ERROR`              | Embedded card 3DS signaled completion, but reconciliation did not reach a final status in time.                                                              | `tonder.pay()` for embedded card 3DS                                     | Do not fulfill from the client result alone; reconcile with `getTransaction()` or webhooks.                                                         |

### Payment method discovery

| Code                               | When it happens                                | Returned by                      | How to fix                                                                                                            |
| ---------------------------------- | ---------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `FETCH_PAYMENT_METHODS_ERROR`      | Active payment methods could not be retrieved. | `tonder.getPaymentMethods()`     | Retry or offer known method codes directly through `pay()`. `getPaymentMethods()` is optional for checkout rendering. |
| `FETCH_PAYMENT_METHOD_BANKS_ERROR` | SafetyPay bank options could not be retrieved. | `tonder.getPaymentMethodBanks()` | Retry later or hide SafetyPay bank-backed options until banks are available.                                          |

### Secure-field session errors

| Code                  | When it happens                                                 | Returned by                                   | How to fix                                     |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `VAULT_TOKEN_ERROR`   | The SDK could not prepare a secure card-fields session.         | `card_fields.mount()`, `card_fields.reveal()` | Verify merchant vault configuration and retry. |
| `INVALID_VAULT_TOKEN` | Tonder returned an invalid secure card-fields session response. | `card_fields.mount()`, `card_fields.reveal()` | Retry and contact Tonder if it persists.       |

### Rare or compatibility codes

These codes are part of the stable enum for compatibility, but they are not expected in normal Web SDK integrations unless a lower-level adapter or legacy path surfaces them.

| Code                            | Meaning                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `CREATE_ERROR`                  | SDK creation failed before a usable instance was returned.            |
| `INVALID_TYPE`                  | Legacy/compat SDK type validation failed.                             |
| `STATE_ERROR`                   | Internal SDK state update failed.                                     |
| `INVALID_CONFIG`                | Required configuration is missing or malformed.                       |
| `MERCHANT_CREDENTIAL_REQUIRED`  | Merchant credential is missing for a lower-level operation.           |
| `ENVIRONMENT_REQUIRED`          | Environment was not provided.                                         |
| `CUSTOMER_AUTH_TOKEN_NOT_VALID` | Customer auth token was rejected by a lower-level saved-card request. |
| `INVALID_CARD_DATA`             | Card data failed lower-level validation.                              |
| `SAVE_CARD_PROCESS_ERROR`       | Lower-level save-card processing failed.                              |
| `SECURE_TOKEN_INVALID`          | Secure token was rejected by a lower-level operation.                 |
| `INVALID_EMAIL`                 | Customer email failed validation.                                     |
| `THREEDS_REDIRECTION_ERROR`     | 3DS redirection failed in a lower-level hosted flow.                  |
| `UNKNOWN_ERROR`                 | Unexpected SDK error fallback.                                        |
