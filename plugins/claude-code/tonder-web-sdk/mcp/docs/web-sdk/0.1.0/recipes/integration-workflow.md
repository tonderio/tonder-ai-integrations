# Integration Workflow

## Project inspection

Look for framework and package signals before asking the user:

| Signal | Framework / strategy |
| ------ | -------------------- |
| `package.json` with React dependencies | React; ask whether to use npm or CDN unless specified |
| `package.json` with Angular dependencies or `angular.json` | Angular; ask whether to use npm or CDN unless specified |
| Static `index.html` without bundler | HTML + CDN |
| Existing script-tag payment integration | Prefer CDN unless the project has a clear bundler |

## Questions to ask only when needed

Ask only for decisions that cannot be inferred:

- Which flow should be integrated?
- Should hosted authentication use `embedded` or `redirect`? Do not assume this value.
- Does the merchant want CDN or npm when the prompt does not specify it?
- If CDN is selected in a TypeScript project, should types come from a type-only npm devDependency or a minimal local ambient declaration?
- Should the integration use default Tonder copy/styles/behavior, or should it include custom SDK options?
- Which existing page/component should receive the checkout UI if multiple candidates exist?

## Integration defaults

| Decision | Default |
| -------- | ------- |
| HTML/static | CDN script |
| React/Angular | Ask npm vs CDN unless the user specifies one |
| Presentation mode | No default; ask the user for `embedded` or `redirect` before calling `get_integration_recipe` for hosted-auth flows |
| Fulfillment | Webhook/backend reconciliation required |
| Idempotency | Include `idempotency_key` in every payment example with a comment explaining retry/deduplication behavior |
| API keys/tokens | Use placeholders, never secrets |

## Optional SDK feature map

Ask for optional behavior only after required decisions are known. Keep the default integration small unless the developer asks for more.

| Feature area | When to ask / use | Implementation guidance |
| ------------ | ----------------- | ----------------------- |
| Secure-field labels/placeholders/errors | Developer wants custom checkout copy or localization | Add `customization.card_fields.labels`, `placeholders`, or `error_messages` in `createTonder()` |
| Secure-field styles/card icon | Developer wants custom visual style inside SDK fields | Add `customization.card_fields.styles`; keep merchant CSS limited to layout around containers |
| Embedded presentation callbacks | `presentation_mode` is `embedded` and developer wants UI side effects | Add `events.presentation.on_open` / `on_close` only for requested behavior |
| Field events | Developer wants validation state/focus analytics | Add `card_fields` `events` callbacks; never read raw PAN/CVV values |
| Custom container IDs | Existing markup already has stable containers | Pass `fields` with `container_id`; otherwise use default container IDs |
| Metadata | Merchant wants order/cart context in the transaction | Add `metadata` with non-sensitive fields |
| Idempotency key | Always include for payments | Add `idempotency_key` with a short code comment explaining that it makes checkout retries safe and prevents duplicate charges. Use a stable value per checkout attempt; do not reuse `client_reference` as fallback. |

## Data safety

The merchant app must not read, validate, store, log, or submit raw PAN/CVV. New card and CVV collection must happen through SDK-rendered secure fields.


## Package resolution guardrails

- Prefer the public package name documented by the Web SDK README.
- Ask npm vs CDN when the user did not specify the loading strategy.
- If npm is selected but the package is unavailable/not published, use the CDN path documented by the Web SDK README instead of a local package.
- If CDN is selected in React or Angular, add the documented `<script>` tag to the HTML entry point (`index.html`/`src/index.html`) before the framework module script; do not create a dynamic `loadTonderScript()` helper.
- If CDN is selected in a TypeScript project, ask whether to add TypeScript support using either a type-only `@tonder.io/web-sdk` devDependency with `import type`, or a minimal local ambient `window.Tonder` declaration. Runtime must still use `window.Tonder`; do not import runtime code from npm in CDN mode.
- Never search parent folders for `tonder-js` or any Tonder monorepo package.
- Never install `file:../tonder-js`, `link:`, or sibling workspace packages. The integration must work for an external developer who only has their own app project.


## MCP recipe rule

Do not call `get_integration_recipe` with guessed required values. For card and saved-card flows, `presentation_mode` must come from the user prompt or from a direct user answer. If it is missing, ask before requesting the recipe or editing files.
