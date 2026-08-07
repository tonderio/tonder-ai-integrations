## API reference

### `createTonder(config)`

Creates an SDK instance.

The returned instance carries no readable properties of its own. `JSON.stringify(tonder)` returns `'{}'` and `Object.keys(tonder)` returns `[]`, where both previously dumped the SDK's internals — your API key and session credentials included — into whatever logger they were handed to. Use the documented methods; there is nothing else on the instance to read.

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
    payment?: {
      on_completed?(transaction: RawTransaction): void;
      on_error?(error: AppError): void;
      on_cancel?(): void;
    };
    presentation?: {
      on_open?(): void;
      on_close?(): void;
    };
  };
  customization?: TonderCustomization;
}
```

`events.payment` fires for every payment method, `pay()` included — see [Events](#events).

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

`unmount_context` controls which previously-mounted card-field context(s) the SDK unmounts before mounting this one. It defaults to `'all'`. Use `'none'` to keep every existing context, `'current'` to replace only the context being mounted, or pass a specific context key to target one.

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

**Every configured field needs its container in the DOM.** `mount()` retries briefly to absorb a late render — 3 attempts over roughly 60 ms — and then rejects with `MOUNT_COLLECT_ERROR` if a container is still missing. It never resolves having mounted only some of the fields, and any field it did mount in a failed call is unmounted before the rejection, so a retry starts clean.

On a client-side route change, call `mount()` after your router has committed the DOM — see [Component lifecycle](#component-lifecycle).

#### Request

No arguments. Containers are configured in `tonder.create('card_fields', options?)`. If no options are provided, the SDK uses the default full-card containers.

#### Response

```ts
Promise<void>;
```

#### Throws

| Code                       | When                                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOT_INITIALIZED`          | `tonder.init()` has not completed.                                                                                                                                                             |
| `SECURE_FIELDS_LOAD_ERROR` | Secure card fields could not load in the browser.                                                                                                                                              |
| `VAULT_TOKEN_ERROR`        | Tonder could not prepare the secure card fields session.                                                                                                                                       |
| `INVALID_VAULT_TOKEN`      | Tonder returned an invalid secure card fields session.                                                                                                                                         |
| `MOUNT_COLLECT_ERROR`      | A configured field cannot be mounted — most often its container is still absent from the DOM after the ~60 ms retry budget. Read `error.originalError` to find out which selector was missing. |

### `card_fields.unmount()`

Unmounts this component's secure card fields.

Skip it on a client-side route change and the secure iframes stay attached to a container your next `mount()` will replace — see [Component lifecycle](#component-lifecycle).

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

### `tonder.isApplePayAvailable()`

Tells you whether to render the Apple Pay container, and why not when you should not. Synchronous, makes no network call, and never throws — including before `init()`.

#### Response

```ts
type ApplePayAvailability =
  | { available: true }
  | { available: false; code: string; message: string };
```

`available` is the discriminant: check it first and TypeScript narrows `code` and `message` into existence.

| `code`                          | Meaning                                     |
| ------------------------------- | ------------------------------------------- |
| `NOT_INITIALIZED`               | `init()` has not finished yet.              |
| `APPLE_PAY_UNSUPPORTED_BROWSER` | This browser cannot run Apple Pay.          |
| `APPLE_PAY_NOT_ENABLED`         | Apple Pay is not enabled for your business. |

The codes and messages are the same ones `mount()` throws for the same conditions, and when more than one applies you get the one `mount()` would report first — in the order listed above.

#### What `available: true` does and does not promise

It means the browser exposes Apple Pay **and** your business has it enabled. It does **not** promise the payment sheet will open: no synchronous check can. In the iOS Simulator, for example, the browser reports it can make payments, the button renders, and Apple dismisses the sheet the moment it is tapped. Treat `true` as "render the button" and handle what happens after the tap through `config.events.payment`.

```ts
const availability = tonder.isApplePayAvailable();

if (availability.available) {
  await tonder.create('apple_pay_button', { payment }).mount();
} else {
  console.info('Apple Pay hidden:', availability.code, availability.message);
}
```

### `tonder.create('apple_pay_button', options)`

Creates the Apple Pay button component. The SDK renders the button and handles the click; call `mount()` to render it. Results arrive on `config.events.payment`, not as a return value.

#### Request

```ts
interface ApplePayButtonOptions {
  /** Container selector. Defaults to '#tonder-apple-pay-button'. */
  container_id?: string;
  /**
   * Payment data for the charge. Pass an object for a fixed amount, or a
   * SYNCHRONOUS function for a cart that can change after mount.
   */
  payment: ApplePayPaymentInput | (() => ApplePayPaymentInput);
}
```

`ApplePayPaymentInput` accepts `amount`, `currency`, `return_url`, `client_reference`, `metadata`, `billing_address` and `idempotency_key` — every field `pay()` takes, and each one is sent on the charge. The single field it does not accept is `payment_method`, because the button already is one.

Style the button through [`customization.apple_pay_button`](#customizationapple_pay_button) on `createTonder()`. The Apple Pay mark itself cannot be replaced — see [The logo cannot be replaced](#the-logo-cannot-be-replaced).

#### Response

```ts
interface ApplePayButtonComponent {
  mount(): Promise<void>;
  unmount(): void;
}
```

#### Throws

| Code                      | When                          |
| ------------------------- | ----------------------------- |
| `INVALID_PAYMENT_REQUEST` | `options.payment` is missing. |

### `apple_pay_button.mount()`

Renders the Apple Pay button into `container_id`. Calling it again replaces the rendered button.

#### Throws

| Code                            | When                                           |
| ------------------------------- | ---------------------------------------------- |
| `NOT_INITIALIZED`               | `init()` has not completed.                    |
| `APPLE_PAY_UNSUPPORTED_BROWSER` | This browser cannot run Apple Pay.             |
| `APPLE_PAY_NOT_ENABLED`         | Apple Pay is not enabled for your business.    |
| `APPLE_PAY_CONTAINER_NOT_FOUND` | No element on the page matches `container_id`. |

### `apple_pay_button.unmount()`

Removes the button and dismisses the payment sheet if one is open. Safe to call more than once.

Skip it on a client-side route change and the open sheet can still be authorized, charging with the payment data captured before you navigated away — see [Component lifecycle](#component-lifecycle).

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
  billing_address?: {
    street?: string;
    street2?: string;
    state?: string;
    country?: string;
    zip_code?: string;
  };
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
| `billing_address`  | No       | Customer billing address. All sub-fields (`street`, `street2`, `state`, `country`, `zip_code`) are optional.   |

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

| Code                                                            | When                                                                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOT_INITIALIZED`                                               | `tonder.init()` has not completed.                                                                                                                                        |
| `MISSING_CUSTOMER`                                              | `session.customer` was not configured.                                                                                                                                    |
| `SECURE_TOKEN_REQUIRED`                                         | `session.secure_token` was not configured, and this charge stores a card: `{ type: 'saved_card' }`, or `{ type: 'card' }` when Card on File is enabled for your business. |
| `INVALID_PAYMENT_REQUEST`                                       | `amount`, `return_url`, or `payment_method` is invalid.                                                                                                                   |
| `INVALID_APM_CONFIG`                                            | `safetypayCash` or `safetypayTransfer` is missing `config.country`, `config.channel`, or `config.bank_ids`.                                                               |
| `MOUNT_COLLECT_ERROR`                                           | Card fields cannot be collected.                                                                                                                                          |
| `PAYMENT_PROCESS_ERROR`                                         | The payment request fails.                                                                                                                                                |
| `FETCH_TRANSACTION_ERROR`                                       | Hosted/3DS resolution cannot retrieve the transaction.                                                                                                                    |
| `POLL_TIMEOUT_ERROR`                                            | Embedded card 3DS signaled completion, but reconciliation did not reach a final status in time.                                                                           |
| `REQUEST_ABORTED`                                               | The embedded hosted-payment wait was canceled.                                                                                                                            |
| `SAVE_CARD_ERROR`, `REMOVE_CARD_ERROR`, `CARD_ON_FILE_DECLINED` | Card-on-file setup or rollback fails.                                                                                                                                     |

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

Apple Pay is never returned here, even when it is enabled for your business. Apple Pay cannot be charged through `pay()` — it is offered through its own SDK-rendered button, see [Apple Pay](#apple-pay) — so listing it as a selectable option would offer your shoppers a method that always fails.

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
