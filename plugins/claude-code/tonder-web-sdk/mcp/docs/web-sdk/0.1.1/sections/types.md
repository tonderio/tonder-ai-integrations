## Types

Useful exports:

```ts
import type {
  TonderConfig,
  PayInput,
  RawTransaction,
  Customer,
  Card,
  EnrollResult,
  PaymentMethodInfo,
  PaymentMethodBank,
  PaymentMethodBanks,
  CardFieldsOptions,
  CardFieldsComponent,
  TonderEvents,
  PresentationEvents,
} from '@tonder.io/web-sdk';
```

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
