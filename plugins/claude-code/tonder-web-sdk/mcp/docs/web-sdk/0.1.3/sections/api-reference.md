## API reference

### `createTonder(config)`

Creates an SDK instance.

#### Request

```ts
interface TonderConfig {
  api_key: string;
  environment: 'sandbox' | 'stage' | 'production';
  session?: {
    customer?: {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    secure_token?: string;
  };
  presentation_mode?: 'redirect' | 'embedded';
  events?: {
    presentation?: {
      on_open?(): void;
      on_close?(): void;
    };
  };
  customization?: TonderCustomization;
}
```

#### Response

Returns a `Tonder` SDK instance.

#### Throws

| Code         | When                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `INIT_ERROR` | `config` is missing, `api_key` is missing, or `environment` is invalid. |

### `tonder.init()`

Fetches merchant configuration and prepares the SDK for card fields and payments. Safe to call more than once.

#### Request

No arguments.

#### Response

```ts
Promise<void>;
```

#### Throws

| Code         | When                                            |
| ------------ | ----------------------------------------------- |
| `INIT_ERROR` | Merchant configuration or initialization fails. |

### `tonder.create('card_fields', options?)`

Creates a secure card-fields component. Call `mount()` on the returned component to render fields. If `options` is omitted, the SDK mounts the full new-card form using the default container IDs.

#### Request

```ts
type CardField =
  | 'cardholder_name'
  | 'card_number'
  | 'expiration_month'
  | 'expiration_year'
  | 'cvv';

interface CardFieldsOptions {
  fields?: (CardField | { field: CardField; container_id?: string })[];
  card_id?: string;
  unmount_context?: 'all' | 'none' | 'current' | 'create' | string;
  events?: Partial<
    Record<
      CardField,
      {
        on_change?(state: CardFieldState): void;
        on_blur?(state: CardFieldState): void;
        on_focus?(state: CardFieldState): void;
        on_ready?(state: CardFieldState): void;
      }
    >
  >;
}
```

Default container IDs:

| Field              | Default container                                          |
| ------------------ | ---------------------------------------------------------- |
| `cardholder_name`  | `#collect-cardholder-name`                                 |
| `card_number`      | `#collect-card-number`                                     |
| `expiration_month` | `#collect-expiration-month`                                |
| `expiration_year`  | `#collect-expiration-year`                                 |
| `cvv`              | `#collect-cvv` or `#collect-cvv-<card_id>` for saved cards |

#### Response

```ts
interface CardFieldsComponent {
  mount(): Promise<void>;
  unmount(): void;
  reveal(input: RevealCardFieldsInput): Promise<void>;
}
```

#### Throws

| Code                     | When                                       |
| ------------------------ | ------------------------------------------ |
| `INVALID_COMPONENT_TYPE` | The first argument is not `'card_fields'`. |

### `card_fields.mount()`

Mounts secure card fields into the configured containers.

Each container should cap its layout height before `mount()` runs, for example `.card-field { width: 100%; max-height: 90px; }`, to avoid a visual jump while the secure iframe initializes.

#### Request

No arguments. Containers are configured in `tonder.create('card_fields', options?)`. If no options are provided, the SDK uses the default full-card containers.

#### Response

```ts
Promise<void>;
```

#### Throws

| Code                       | When                                                     |
| -------------------------- | -------------------------------------------------------- |
| `NOT_INITIALIZED`          | `tonder.init()` has not completed.                       |
| `SECURE_FIELDS_LOAD_ERROR` | Secure card fields could not load in the browser.        |
| `VAULT_TOKEN_ERROR`        | Tonder could not prepare the secure card fields session. |
| `INVALID_VAULT_TOKEN`      | Tonder returned an invalid secure card fields session.   |
| `MOUNT_COLLECT_ERROR`      | A configured field cannot be mounted.                    |

### `card_fields.unmount()`

Unmounts this component's secure card fields.

#### Request

No arguments.

#### Response

```ts
void
```

### `card_fields.reveal(input)`

Reveals display-safe saved-card values into merchant containers. CVV cannot be revealed.

#### Request

```ts
type RevealableCardField =
  | 'cardholder_name'
  | 'card_number'
  | 'expiration_month'
  | 'expiration_year';

interface RevealCardFieldsInput {
  fields: (
    | RevealableCardField
    | {
        field: RevealableCardField;
        container_id?: string;
        alt_text?: string;
        label?: string;
        styles?: CardFieldsCustomization['styles'];
      }
  )[];
  styles?: CardFieldsCustomization['styles'];
}
```

#### Response

```ts
Promise<void>;
```

#### Throws

| Code                       | When                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| `NOT_INITIALIZED`          | `tonder.init()` has not completed or no card tokens are available to reveal. |
| `SECURE_FIELDS_LOAD_ERROR` | Secure card fields could not load in the browser.                            |
| `VAULT_TOKEN_ERROR`        | Tonder could not prepare the secure card fields session.                     |
| `INVALID_VAULT_TOKEN`      | Tonder returned an invalid secure card fields session.                       |

### `tonder.pay(input)`

Creates a payment.

For `{ type: 'saved_card', card_id }`, `tonder.pay()` requires `session.secure_token` because the SDK must look up the saved card and may collect CVV/update Card-on-File data before charging it. For `{ type: 'card' }`, `session.secure_token` is only required when Card on File is enabled for the business and the SDK must save the new card before processing the payment.

#### Request

```ts
interface PayInput {
  amount: number;
  currency?: string;
  return_url: string;
  payment_method:
    | { type: 'card' }
    | { type: 'saved_card'; card_id: string }
    | { type: string; config?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
  client_reference: string;
  idempotency_key?: string;
}
```

| Field              | Required | Description                                                                                                    |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `amount`           | Yes      | Payment amount. Must be greater than `0`.                                                                      |
| `currency`         | No       | Currency code. Defaults to `MXN` when omitted.                                                                 |
| `return_url`       | Yes      | URL used after hosted authentication or redirect completion.                                                   |
| `payment_method`   | Yes      | Payment method to charge: new card, saved card, or an enabled alternative payment method.                      |
| `client_reference` | Yes      | Merchant order/reference shown in dashboards, exports, webhooks, transaction records, and transaction reports. |
| `idempotency_key`  | No       | Recommended stable key for the same payment attempt so retries do not create duplicate charges.                |
| `metadata`         | No       | Non-sensitive merchant context for reconciliation and reports.                                                 |

Examples:

```ts
await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'card' },
});
```

```ts
await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'saved_card', card_id: 'card_123' },
});
```

```ts
await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'spei' },
});
```

`client_reference` is the required merchant/business reference that remains in the payment payload and appears in dashboards, exports, webhooks, transaction records, and transaction reports as the customer order reference.

`idempotency_key` is important for retry-safe checkout flows: keep it stable for the same payment attempt so retries do not create duplicate charges. Do not reuse `client_reference` as the idempotency key.

Use `metadata` for non-sensitive merchant context that helps reconciliation and reports. You can send any JSON-safe fields your commerce system needs. These metadata keys have reporting meaning when present:

| Metadata key     | Report usage                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `operation_date` | Business operation date/time for reporting and reconciliation.                              |
| `customer_email` | Customer email shown in transaction reports; falls back to the customer email when omitted. |
| `customer_id`    | Merchant customer identifier for report filtering and reconciliation.                       |
| `business_user`  | Internal user, POS terminal, cashier, or automation that initiated the payment.             |

```ts
await tonder.pay({
  amount: 150,
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  idempotency_key: 'checkout-attempt-1001-1',
  metadata: {
    customer_email: 'ada@example.com',
    customer_id: 'cus_123',
    business_user: 'pos-terminal-4',
    // ... other fields
  },
  payment_method: { type: 'card' },
});
```

#### Response

Returns `Promise<RawTransaction>`.

```json
{
  "id": "txn_123",
  "operation_type": "payment",
  "status": "Authorized",
  "amount": 150,
  "currency": "MXN",
  "client_reference": "order_1001",
  "metadata": { "cart_id": "cart_789" },
  "created_at": "2026-07-06T18:00:00Z"
}
```

A transaction that needs 3DS or hosted instructions can include `next_action`:

```json
{
  "id": "txn_123",
  "operation_type": "payment",
  "status": "Pending",
  "amount": 150,
  "currency": "MXN",
  "next_action": {
    "redirect_to_url": {
      "url": "https://hosted-payment.example/checkout/..."
    }
  }
}
```

APM/SPEI responses may include settlement fields:

```json
{
  "id": "txn_123",
  "operation_type": "payment",
  "status": "Pending",
  "amount": 150,
  "currency": "MXN",
  "clabe": "646180123400000001",
  "bank_name": "STP",
  "payment_instructions": { "reference": "1234567890" },
  "voucher_pdf": "https://..."
}
```

#### Throws

| Code                                                            | When                                                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `NOT_INITIALIZED`                                               | `tonder.init()` has not completed.                                                                          |
| `MISSING_CUSTOMER`                                              | `session.customer` was not configured.                                                                      |
| `INVALID_PAYMENT_REQUEST`                                       | `amount`, `return_url`, or `payment_method` is invalid.                                                     |
| `INVALID_APM_CONFIG`                                            | `safetypayCash` or `safetypayTransfer` is missing `config.country`, `config.channel`, or `config.bank_ids`. |
| `MOUNT_COLLECT_ERROR`                                           | Card fields cannot be collected.                                                                            |
| `PAYMENT_PROCESS_ERROR`                                         | The payment request fails.                                                                                  |
| `FETCH_TRANSACTION_ERROR`                                       | Hosted/3DS resolution cannot retrieve the transaction.                                                      |
| `POLL_TIMEOUT_ERROR`                                            | Embedded card 3DS signaled completion, but reconciliation did not reach a final status in time.             |
| `REQUEST_ABORTED`                                               | The embedded hosted-payment wait was canceled.                                                              |
| `SAVE_CARD_ERROR`, `REMOVE_CARD_ERROR`, `CARD_ON_FILE_DECLINED` | Card-on-file setup or rollback fails.                                                                       |

### `tonder.getTransaction(id)`

Reads the current transaction state. Useful on `return_url` pages and admin/reconciliation views. Does not require `session.customer` or `init()`.

#### Request

```ts
tonder.getTransaction(id: string): Promise<RawTransaction>
```

#### Response

Same `RawTransaction` shape as `pay()`.

#### Throws

| Code                      | When                                 |
| ------------------------- | ------------------------------------ |
| `FETCH_TRANSACTION_ERROR` | The transaction cannot be retrieved. |
| `REQUEST_ABORTED`         | The browser request was canceled.    |

### `tonder.enrollCard()`

Saves the currently mounted new card for `session.customer`. Requires `session.secure_token` because card enrollment is a card CRUD/Card-on-File operation.

#### Request

No arguments. Requires a mounted new-card `card_fields` component.

#### Response

```ts
interface EnrollResult {
  card_id: string;
  subscription_id?: string;
}
```

#### Throws

| Code                       | When                                        |
| -------------------------- | ------------------------------------------- |
| `NOT_INITIALIZED`          | `tonder.init()` has not completed.          |
| `MISSING_CUSTOMER`         | `session.customer` was not configured.      |
| `SECURE_TOKEN_REQUIRED`    | `session.secure_token` was not configured.  |
| `MOUNT_COLLECT_ERROR`      | Card fields cannot be collected.            |
| `CUSTOMER_OPERATION_ERROR` | Customer registration/fetch fails.          |
| `SAVE_CARD_ERROR`          | Card save fails.                            |
| `CARD_ON_FILE_DECLINED`    | Card-on-file enrollment is declined.        |
| `ACQUIRER_LOAD_ERROR`      | Card-on-file processor library cannot load. |

### `tonder.getCustomerCards()`

Lists saved cards for `session.customer`. `subscription_id` is returned only when Card-on-File is enabled for the business. When it is `null`, mount the saved-card CVV field before calling `pay()` with that card.

#### Request

No arguments.

#### Response

```ts
interface Card {
  card_id: string;
  card_number: string; // masked
  expiration_month: string;
  expiration_year: string;
  card_scheme: string;
  subscription_id: string | null;
}
```

Example:

```json
[
  {
    "card_id": "card_123",
    "card_number": "XXXX-XXXX-XXXX-4242",
    "expiration_month": "12",
    "expiration_year": "29",
    "card_scheme": "visa",
    "subscription_id": "sub_123"
  }
]
```

#### Throws

| Code                       | When                                       |
| -------------------------- | ------------------------------------------ |
| `NOT_INITIALIZED`          | `tonder.init()` has not completed.         |
| `MISSING_CUSTOMER`         | `session.customer` was not configured.     |
| `SECURE_TOKEN_REQUIRED`    | `session.secure_token` was not configured. |
| `CUSTOMER_OPERATION_ERROR` | Customer registration/fetch fails.         |
| `FETCH_CARDS_ERROR`        | Saved cards cannot be retrieved.           |

### `tonder.removeCustomerCard(card_id)`

Removes a saved card for `session.customer`.

#### Request

```ts
tonder.removeCustomerCard(card_id: string): Promise<void>
```

#### Response

```ts
Promise<void>;
```

#### Throws

| Code                       | When                                       |
| -------------------------- | ------------------------------------------ |
| `NOT_INITIALIZED`          | `tonder.init()` has not completed.         |
| `MISSING_CUSTOMER`         | `session.customer` was not configured.     |
| `SECURE_TOKEN_REQUIRED`    | `session.secure_token` was not configured. |
| `CUSTOMER_OPERATION_ERROR` | Customer registration/fetch fails.         |
| `REMOVE_CARD_ERROR`        | Saved card cannot be removed.              |

### `tonder.getPaymentMethods()`

Lists active payment methods configured for your business. Can be called before `init()`.

This method is for discovery/rendering only. It is not required before `pay()`: you may pass a known enabled method code directly, such as `payment_method: { type: 'spei' }` or `payment_method: { type: 'oxxopay' }`.

#### Request

No arguments.

#### Response

```ts
interface PaymentMethodInfo {
  id: number;
  payment_method: string;
  label: string;
  logo: string;
  category: string;
}
```

Example:

```json
[
  {
    "id": 7,
    "payment_method": "oxxopay",
    "label": "Oxxo Pay",
    "logo": "https://...",
    "category": "cash"
  }
]
```

#### Throws

| Code                          | When                                 |
| ----------------------------- | ------------------------------------ |
| `FETCH_PAYMENT_METHODS_ERROR` | Payment methods cannot be retrieved. |

### `tonder.getPaymentMethodBanks()`

Lists SafetyPay bank options grouped by channel. Can be called before `init()`.

#### Request

No arguments.

#### Response

```ts
interface PaymentMethodBank {
  id: number;
  name: string;
  code: string;
  country: string;
  channel: 'WP' | 'OL';
  logo?: string;
}

interface PaymentMethodBanks {
  cash: PaymentMethodBank[];
  transfer: PaymentMethodBank[];
}
```

Example:

```json
{
  "cash": [
    {
      "id": 47,
      "name": "Banco Azteca",
      "code": "8186",
      "country": "Mexico",
      "channel": "WP",
      "logo": "https://..."
    }
  ],
  "transfer": []
}
```

#### Throws

| Code                               | When                              |
| ---------------------------------- | --------------------------------- |
| `FETCH_PAYMENT_METHOD_BANKS_ERROR` | Bank options cannot be retrieved. |
