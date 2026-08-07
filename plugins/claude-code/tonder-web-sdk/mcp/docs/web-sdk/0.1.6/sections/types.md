## Types

Every type below is exported from the package root.

Configuration and session:

```ts
import type {
  TonderConfig,
  TonderSession,
  TonderMode,
  Customer,
  BillingAddress,
  TonderEvents,
  PresentationEvents,
  PaymentEvents,
} from '@tonder.io/web-sdk';
```

Payments and transactions:

```ts
import type {
  PayInput,
  PaymentMethod,
  RawTransaction,
  BackendNextAction,
  PaymentMethodInfo,
  PaymentMethodBank,
  PaymentMethodBanks,
} from '@tonder.io/web-sdk';
```

Cards:

```ts
import type {
  Card,
  EnrollResult,
  CardFieldsOptions,
  CardFieldsComponent,
  CardField,
  CardFieldState,
  CardFieldEvents,
  RevealCardFieldsInput,
  RevealableCardField,
} from '@tonder.io/web-sdk';
```

Apple Pay:

```ts
import type {
  ApplePayAvailability,
  ApplePayButtonOptions,
  ApplePayButtonComponent,
  ApplePayPaymentInput,
} from '@tonder.io/web-sdk';
```

Components and customization:

```ts
import type {
  TonderMountableComponent,
  TonderComponent,
  TonderComponentType,
  TonderCustomization,
  CardFieldsCustomization,
  ApplePayButtonCustomization,
  CardLabels,
  CardPlaceholders,
  CardStyles,
  CardFieldErrorMessages,
  FieldStyles,
  CollectInputStyles,
  LabelStyles,
  ErrorTextStyles,
} from '@tonder.io/web-sdk';
```

Errors:

```ts
import { AppError, ErrorKeyEnum } from '@tonder.io/web-sdk';
import type { AppErrorInput } from '@tonder.io/web-sdk';
```

`TonderMountableComponent` is the shared shape of anything `tonder.create(...)` returns — both `card_fields` and `apple_pay_button` — so it is the type to reach for when a variable holds either. See [Mount and unmount inside a component](#mount-and-unmount-inside-a-component).

If you load the SDK runtime from the CDN in a TypeScript app, you can still install `@tonder.io/web-sdk` as a devDependency for types only. See [CDN with TypeScript types](#cdn-with-typescript-types).

### `RawTransaction`

`pay()` and `getTransaction()` return transaction fields in `snake_case`, matching Tonder API and webhook payloads.

```ts
interface RawTransaction {
  id: string;
  operation_type: string;
  status: string;
  amount: number;
  currency: string;
  client_reference?: string;
  metadata?: Record<string, unknown>;
  provider?: string;
  created_at?: string;
  status_code?: number;
  next_action?: {
    redirect_to_url?: {
      url: string;
      verify_transaction_status_url?: string;
    };
  };
  decline_code?: string;
  decline_reason?: string;
  payment_instructions?: Record<string, unknown>;
  voucher_pdf?: string;
  clabe?: string;
  bank_name?: string;
  [key: string]: unknown;
}
```
