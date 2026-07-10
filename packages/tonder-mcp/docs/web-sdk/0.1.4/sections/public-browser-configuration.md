## Public browser configuration

Read deployment-specific SDK values from your app's public browser configuration instead of hardcoding real merchant values in checkout code. The Tonder public API key is safe to expose to the browser, but keeping it in config makes environment switching and key rotation safer.

Use the convention for your framework.

Vite / React:

```ts
const tonderPublicConfig = {
  api_key: import.meta.env.VITE_TONDER_PUBLIC_API_KEY,
  environment: import.meta.env.VITE_TONDER_ENVIRONMENT as
    | 'sandbox'
    | 'stage'
    | 'production',
};
```

Next.js Client Components:

```ts
const tonderPublicConfig = {
  api_key: process.env.NEXT_PUBLIC_TONDER_PUBLIC_API_KEY,
  environment: process.env.NEXT_PUBLIC_TONDER_ENVIRONMENT as
    | 'sandbox'
    | 'stage'
    | 'production',
};
```

Angular:

```ts
import { environment } from '../environments/environment';

const tonderPublicConfig = {
  api_key: environment.tonderPublicApiKey,
  environment: environment.tonderEnvironment,
};
```

Plain HTML / server-rendered config:

```ts
const tonderPublicConfig = window.__TONDER_CONFIG__;
```

`currency` is checkout/business data. Keep it in your checkout state or merchant configuration; it does not need to be an environment variable unless your app already manages it that way.
