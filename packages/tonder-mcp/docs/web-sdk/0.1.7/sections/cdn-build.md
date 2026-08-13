## CDN build

For browser `<script>` usage, load the SDK from the environment CDN:

| Environment | CDN URL                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| Stage       | `https://zplit-stage.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js` |
| Production  | `https://zplit-prod.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js`  |

```html
<script src="https://zplit-stage.s3.us-east-1.amazonaws.com/web-sdk/v1/tonder-web-sdk.min.js"></script>
<script>
  const { createTonder } = window.Tonder;
</script>
```

### CDN with TypeScript types

The CDN build exposes the SDK at `window.Tonder`. If a React, Angular, or TypeScript app loads the runtime from the CDN, TypeScript does not automatically know the global SDK shape.

You can install the npm package as a development dependency only for types while still using the CDN runtime:

```bash
npm install -D @tonder.io/web-sdk
```

```ts
import type * as TonderWebSdk from '@tonder.io/web-sdk';

declare global {
  interface Window {
    Tonder: typeof TonderWebSdk;
  }
}
```

Keep the CDN script in your HTML entry point and use the browser global at runtime:

```ts
const { createTonder } = window.Tonder;
```

Do not import runtime code from `@tonder.io/web-sdk` when using the CDN setup. The package is installed only as a devDependency for TypeScript types.
