---
name: tonder-web-sdk-integrator
description: Use when integrating the Tonder Web SDK into a merchant web project, or when migrating an existing Tonder integration to it from the Direct API or the legacy checkout SDK. Supports browser-based web apps including vanilla HTML, React, Next.js, Angular, and similar frameworks; card payments, card enrollment, saved cards, payment methods, SafetyPay banks, Apple Pay, embedded or redirect presentation, CDN or npm setup, and validation that raw card data is not handled by merchant code. Requires the bundled tonder-docs MCP server as the integration source of truth.
---

# Tonder Web SDK Integrator

Integrate the Tonder Web SDK into the user's project using the public SDK contract and the smallest safe implementation for the selected framework and payment flow.


## Security boundary

This plugin is for public SDK integration guidance only. It must never be used to inspect, infer, or expose Tonder private implementation details.

- Use only the public SDK contract returned by the bundled `tonder-docs` MCP server.
- Do not reverse engineer the Tonder SDK, installed packages, minified bundles, source maps, network traffic, or runtime behavior to discover implementation details.
- Do not expose or invent internal Tonder endpoints, backend service names, request bodies, headers, authentication schemes, infrastructure details, incident details, or non-public API behavior.
- Do not search local or sibling repositories for Tonder SDK internals, even if they exist on the user's machine.
- If the user asks how Tonder works internally, explain that the plugin only provides public integration contracts and merchant-facing guidance.
- If a required integration detail is missing from `tonder-docs`, stop and report the documentation gap instead of guessing or inspecting internals.

## Source of truth

Use the bundled `tonder-docs` MCP server as the only documentation source for public integration details.

Before editing, call the MCP tools needed for the selected work:

- `get_integration_recipe` for the selected framework, flow, and presentation mode.
- `get_migration_guide` when the project already has a Tonder integration — `from: 'direct_api'` for a server-to-server integration, `from: 'legacy_sdk'` for `InlineCheckout`/`LiteInlineCheckout`. Use it instead of `get_integration_recipe`, not alongside it.
- `get_sdk_api_reference` for method signatures, payloads, CDN/npm setup, and customization details.
- `get_error_reference` when adding error handling or explaining SDK errors.
- `get_payment_status_reference` when handling or explaining payment statuses.

If `tonder-docs` MCP is unavailable or does not return the required information, stop and report the blocker. Do not use local copies of SDK docs, sibling repos, SDK package inspection, browser network traces, source maps, or improvised examples as a fallback.

## Workflow

1. Inspect the project before asking questions.
2. **Check whether the project already integrates Tonder.** Look for `tonder-web-sdk` in `package.json` or a script tag, `InlineCheckout` or `LiteInlineCheckout` in the code, or server-side calls that build a Tonder charge. If you find any of them this is a **migration**, not a new integration:
   - Call `get_migration_guide` with `from: 'legacy_sdk'` for `InlineCheckout`/`LiteInlineCheckout`, or `from: 'direct_api'` for a server-to-server integration, and follow it instead of `get_integration_recipe`.
   - Tell the user what you found and which guide you are following before editing.
   - Never leave the legacy SDK loaded next to the new one. Two payment SDKs on one page is a defect, not a transition step.
   - A server-to-server Direct API integration is different: it is not a second SDK, and the guide defines an incremental path that adds the SDK while the existing charge calls keep running. Follow the guide's pacing. Do not tear out a working server-side checkout that the guide tells you to leave in place.
3. Detect framework:
   - HTML/static page
   - React
   - Angular
   - If detection is ambiguous, ask the user to confirm.
4. Confirm the target page/component before editing when the project has multiple plausible checkout pages, routes, or components. Stop and ask one question. Explain that this decides where the checkout UI and SDK lifecycle code will be added.
5. Confirm the integration flow if the prompt does not specify one. Stop and ask one question. Explain the relevant choices briefly:
   - card payment: shopper enters a new card in secure SDK fields and pays now.
   - enroll card: shopper saves a new card for future payments.
   - saved cards: shopper pays with an existing saved card, sometimes with CVV collection.
   - payment methods: shopper pays with an alternative method such as SPEI or OXXO Pay.
   - SafetyPay banks: shopper selects a SafetyPay bank for cash/transfer flows.
6. **Ask whether to add the Apple Pay button as well**, unless the user already said so or already picked Apple Pay as the flow. Stop and ask one question. Apple Pay is **additive**, not an alternative: it sits next to the flow chosen above and most merchants want both. Explain that it renders an Apple Pay button for shoppers on supported Apple devices, that it does not change the flow already chosen, and that it needs a one-time domain setup with Tonder which can run in parallel with the integration.
7. If Apple Pay was selected, ask its own questions one at a time, and do not block the integration on any of them:
   - **Where the button goes** on the target page, relative to the other payment options.
   - **Whether their domains are already registered with Tonder and Apple Pay is enabled for their business.** If not, tell them to send Tonder every domain and subdomain that will show the button and to start that now — it runs in parallel and you keep integrating either way. Never stop the work waiting for it.
   - **Whether they want to customize the button** — `type`, `style`, `locale`, `width`, `height`, `border_radius`. If they do not, add no customization.
8. Confirm presentation mode if the selected flow can require hosted authentication and the user did not specify it. Stop and ask one question before editing; do not choose a default. Explain both choices in the question. Apple Pay never uses hosted authentication, so do not ask for presentation mode when Apple Pay is the only thing being added:
   - `embedded`: Tonder opens the hosted authentication/checkout step in an SDK modal/iframe inside the merchant page.
   - `redirect`: the browser navigates to the hosted step and returns to the provided `return_url`.
9. Confirm SDK loading strategy unless the user already specified it. Stop and ask one question before editing; do not choose a default for React/Angular/bundled apps. Explain both choices in the question. Both work in every framework, so do not present the CDN as a fallback for projects without a build step. For a plain static HTML page, CDN may be inferred only when there is no package manager or bundler:
   - `cdn`: add the Tonder browser script URL directly to the page. The URL tracks a major-version channel, so fixes arrive without a release of the merchant's own.
   - `npm`: install/import the public SDK package through the app bundler. Pinned to the version installed and upgraded deliberately.
   - If npm is unavailable or not published, use the documented CDN path instead; do not search for or install local SDK packages.
10. If CDN is selected for a TypeScript project such as React or Angular, confirm the typing strategy unless the user already specified it. Stop and ask one question. Explain that CDN provides the runtime through `window.Tonder`, but TypeScript still needs a type declaration:
    - type-only devDependency: install `@tonder.io/web-sdk` with `-D` and use `import type` only; runtime still comes from the CDN.
    - local ambient declaration: add a minimal `window.Tonder` declaration without installing the npm package.
    For plain HTML/JavaScript projects, skip this question.
11. Ask whether the developer wants the default Tonder UX/configuration or custom SDK options, unless already specified. Stop and ask one question. Explain that defaults use Tonder-provided secure-field labels, placeholders, styles, validation messages, and basic presentation behavior; custom options can include secure-field labels/placeholders/error messages/styles, `events.presentation.on_open`, `events.presentation.on_close`, `idempotency_key`, metadata, card-field event callbacks, or custom container IDs. If they choose defaults, do not add customization code. If they choose custom options, ask for only the relevant details one at a time.
12. After all required decisions are known, use `tonder-docs` MCP to load the selected recipe/API reference. Do not call `get_integration_recipe` with an assumed `presentation_mode`; for card or saved-card flows, the value must come from the user prompt or from a direct user answer. When Apple Pay was also selected, call `get_integration_recipe` a second time with `flow: 'apple_pay'`.
13. Implement only the selected flows and required UI/state.
14. Validate that the integration does not collect raw card data in merchant code.
15. Add minimal merchant-facing notes for backend reconciliation and webhooks.
16. Run available typecheck/build/test commands when safe.
17. Final response must include: changed files, validation run, documentation source used, and concise setup notes telling the developer to configure their Tonder public API key and SDK environment through the app's public environment/configuration system, use `client_reference` as the merchant order/reference shown in dashboards, reports, webhooks, and transaction records, keep the generated `idempotency_key` stable per checkout attempt to make retries safe, optionally pass non-sensitive `metadata` such as `customer_email`, `customer_id`, `business_user`, `operation_date`, or `order_id` when they want richer transaction reports, configure webhooks in the Tonder dashboard before fulfillment, and update environment/CDN values when moving from stage to production. If CDN with type-only npm was selected, say that `@tonder.io/web-sdk` is a devDependency for TypeScript types only and the runtime still comes from the CDN. Always include a short reminder that Card on File, saved cards, list/remove cards, and card enrollment require a short-lived `secure_token` generated by the merchant backend and passed to the SDK, and that merchants should confirm with Tonder whether COF is enabled for their business. If an alert or temporary shopper message was added, explicitly say it is only the UI handoff point and the merchant should replace/adapt it to their checkout UX; it is not fulfillment authority. **If Apple Pay was integrated, the final response must also include the Apple Pay go-live steps** — see the section below; without them the button works in development and fails in production.

## Required MCP usage by task

| Task | Required MCP calls before editing |
| ---- | --------------------------------- |
| Card payment | `get_integration_recipe`, `get_sdk_api_reference` for `pay`, `card_fields`, and CDN/npm setup |
| Enroll card | `get_integration_recipe`, `get_sdk_api_reference` for `enrollCard`, `card_fields`, customer/session credentials |
| Saved cards | `get_integration_recipe`, `get_sdk_api_reference` for `getCustomerCards`, saved-card payment, CVV/card fields |
| Payment methods | `get_integration_recipe`, `get_sdk_api_reference` for `getPaymentMethods` and `pay` |
| SafetyPay banks | `get_integration_recipe`, `get_sdk_api_reference` for `getPaymentMethodBanks`, SafetyPay config, and `pay` |
| Apple Pay | `get_integration_recipe` with `flow: 'apple_pay'`, `get_sdk_api_reference` for `isApplePayAvailable` and `apple_pay_button` |
| Migration from an existing Tonder integration | `get_migration_guide` with `from: 'direct_api'` or `from: 'legacy_sdk'`, then `get_sdk_api_reference` for the methods the guide uses |
| Error/status handling | `get_error_reference`, `get_payment_status_reference` |

## Apple Pay

Apple Pay is the one flow that is not a `pay()` call. It is a mountable component: the SDK renders the button and owns the click. Treating it like the other flows produces code that cannot work.

| Rule | What it means for the integration |
| ---- | --------------------------------- |
| Check availability before rendering | Call `tonder.isApplePayAvailable()` after `init()`. It returns `{ available: true }` or `{ available: false, code, message }` — an object, never a boolean. Read `.available`; using the object itself as a condition is always truthy and is a bug. Render the container and mount only when `available` is `true`, and log `code` otherwise. |
| The container is merchant-supplied | Render an empty container the SDK mounts into, default `#tonder-apple-pay-button`, or pass `container_id`. Never render merchant-owned button markup, label text, or Apple logo inside it. Style the button through `customization.apple_pay_button` on `createTonder()`. |
| The payment function is synchronous | `payment` may be an object or a function. If it is a function it must be synchronous and free of `await`, because Apple requires the sheet to open in the same tick as the tap. Fetch any server-side data before the tap and read it from a variable inside the function. |
| Results come through events | There is no promise to await. Handle `events.payment.on_completed`, `on_error`, and `on_cancel` from `createTonder()`. `on_completed` fires for declines too, so branch on `transaction.status`; `on_cancel` is not an error. |
| Teardown is required | Call `button.unmount()` when the checkout view is destroyed. On a client-side route change an orphaned sheet can still be authorized and will charge with stale payment data. |
| Domain setup is required to go live, but never blocks the work | Apple Pay on the Web requires the domain to be registered and verified, and Apple Pay to be enabled for the business in Tonder. Neither is an SDK option, and neither is a reason to pause the integration — they run in parallel. This is the most likely production-only failure, so it belongs in the final response. See the sections below. |

Do not offer Apple Pay through `getPaymentMethods()` results or `pay({ payment_method: { type: 'apple_pay' } })`. That call is rejected by design.

### Domain setup, and how it interacts with the integration

Apple will not let a page take an Apple Pay payment until its domain is registered. Tonder performs that registration — the merchant never contacts Apple and needs no Apple developer account. The merchant sends Tonder their domains, Tonder returns a verification file, the merchant hosts it, and Tonder finishes the verification.

**This never blocks the integration.** The merchant, Tonder, and you can work in parallel: keep writing code while the domains are being sent and registered. Do not stop, do not ask the user to come back later, and do not make the domain answer a precondition for any code change.

Two failures look different, and the developer should know both up front: an unregistered domain renders the button, opens the sheet, then closes it with `APPLE_PAY_VALIDATION_ERROR` on `on_error`; Apple Pay not enabled for the business means `isApplePayAvailable()` returns `APPLE_PAY_NOT_ENABLED` and no button ever renders.

### Placing the verification file

If the merchant already has the file from Tonder, place it yourself — this is ordinary repo work. It must be served over HTTPS at `https://<domain>/.well-known/<the exact filename Tonder sent>`, with no redirect and no authentication. Keep the filename and the bytes exactly as delivered; the contents are matched byte for byte.

| Project type | Where the file goes |
| ------------ | ------------------- |
| Next.js, React, Vite, and other static-asset bundlers | `public/.well-known/` |
| Angular | `src/assets/.well-known/`, plus an `assets` entry in `angular.json` so the dot-directory is copied into the build |
| Plain HTML site | `.well-known/` at the web root |

Then warn the developer about the two things that make a correct file fail:

- **A single-page-app catch-all route answers `200` with `index.html` for unknown paths.** The URL looks healthy while serving the wrong bytes, so tell them to check the response **body**, not the status code, before telling Tonder the file is live.
- **Some hosts do not serve dot-directories** and need explicit configuration. Apple fetches the file from the merchant's own server, so a WAF, CDN rule, or geo-block in front of the domain has to allow it through — Tonder is not in that request path.

If the merchant does not have the file yet, do not invent one and do not create a placeholder. Say what the file is for and where you will put it once Tonder sends it.

### Apple Pay go-live steps for the final response

When Apple Pay was integrated, the final response must list these, as merchant action items:

1. Send Tonder every domain and subdomain that will show the button — staging, production, and any preview or vanity domain each need their own registration.
2. Confirm with Tonder that Apple Pay is enabled for the business; that is a separate step from registering a domain.
3. Host the verification file Tonder sends at `/.well-known/` on each domain — say whether you already placed it and at which path, or that it is still pending.
4. Open the file URL and verify the response body before telling Tonder it is live.
5. Tell Tonder the file is live so it can complete the verification with Apple.

## Hard rules

- Never create card number, expiration, or CVV `<input>` elements in merchant code for card collection.
- Use secure SDK-rendered card fields for new cards and CVV collection.
- Do not add merchant-owned labels, input borders, padding, or field-card wrappers around SDK secure-field containers; the SDK renders labels, inputs, validation, and errors inside the secure iframe. Merchant CSS may only control layout such as width, max-height, margin, grid, or gap. When creating secure-field containers, use `.card-field { width: 100%; max-height: 90px; }` unless the app already has equivalent layout styles. `customization.card_fields.styles` may style the SDK-rendered secure input, label, error, and icon inside the iframe, including input-level sizing when supported by the SDK renderer. It does not replace the merchant CSS needed to cap the mount container height while the iframe initializes; keep container sizing such as `.card-field { width: 100%; max-height: 90px; }` in merchant CSS.
- For Angular CDN/global SDK integrations, use Angular `signal()` state for loading/status UI or call `ChangeDetectorRef.detectChanges()` after SDK promises/callbacks. `NgZone.run(...)` alone may not update zoneless Angular apps.
- Keep public payload fields in snake_case.
- Never implement Apple Pay through `pay()`. Use `tonder.create('apple_pay_button', { payment })` plus `mount()`, gate it on `tonder.isApplePayAvailable().available`, read results from `events.payment`, and `unmount()` on teardown.
- Never treat `isApplePayAvailable()` as a boolean. Read the `available` property.
- Never make an Apple Pay `payment` callback `async` or put `await` inside it.
- Never block the integration on Apple Pay domain registration or on Apple Pay being enabled for the business. Both run in parallel with the code. Ask about them for the handoff notes, then keep working regardless of the answer.
- Never write a placeholder Apple Pay verification file. The contents come from Tonder and are matched byte for byte; a made-up file fails verification and looks like it succeeded.
- When the project already has a Tonder integration, call `get_migration_guide` and follow it instead of `get_integration_recipe`. Never leave the legacy SDK loaded alongside the new one. A server-to-server Direct API integration is not a second SDK — remove or keep its charge calls at the pace the guide sets, and never rip out a working server-side checkout the guide tells you to leave running.
- Read the Tonder public API key and SDK environment from the app's public environment/configuration system instead of hardcoding merchant values in components or scripts. Use framework-appropriate access: Vite uses `import.meta.env.VITE_*`, Next.js Client Components use `process.env.NEXT_PUBLIC_*`, Angular uses `environment.ts`/file replacements, and plain HTML uses merchant-provided public runtime config such as a server-rendered `window.__TONDER_CONFIG__`.
- Do not force `currency` into environment variables; it is merchant checkout/business data unless the existing app already centralizes it in config.
- Require `client_reference` for payments; it is the merchant order/reference used in dashboards, reports, webhooks, and transaction records.
- Pass `return_url` in `pay()` when hosted authentication or redirect completion may be needed.
- Do not treat browser success as fulfillment authority; mention backend/webhook reconciliation.
- Do not add permanent raw JSON `<pre>` result dumps unless the user explicitly asks for demo/debug output. For generic examples, use a simple `alert()` with `transaction.status` and a code comment that this is the handoff point for the merchant's real checkout UX.
- In React examples, do not create generic `result`/`setResult` state or render `<p className="result">{result}</p>`. Use `status`/`setStatus` only for setup/progress/error copy; show the payment result through the alert handoff unless the existing app already has its own result/toast system.
- Always include `idempotency_key` in payment calls, with a short code comment explaining that it should be stable per checkout attempt so retries do not create duplicate charges. Do not reuse `client_reference` as the idempotency key.
- Do not add SDK customization, presentation callbacks, metadata, card-field event callbacks, or custom container IDs unless the user requests them or the existing project clearly requires them. When metadata is relevant, keep it non-sensitive and prefer reporting-friendly keys such as `customer_email`, `customer_id`, `business_user`, or `operation_date`.
- Do not store real API keys, secure tokens, customer data, or card data in generated files. Public API key placeholders are acceptable; real deployment values must come from the app's public environment/configuration layer.
- Do not search parent/sibling folders for `tonder-js`, local SDK packages, source maps, built SDK bundles, internal API clients, or monorepo workspaces. The developer project is the only editable project.
- Do not install `file:../tonder-js`, `link:`, or sibling workspace packages. If npm is unavailable, use the documented CDN integration instead.
- Do not inspect `node_modules`, browser bundles, source maps, runtime network traffic, or installed Tonder SDK package code to infer private Tonder behavior.
- Do not expose or invent internal Tonder API endpoints, headers, backend request/response bodies, service names, or infrastructure details.
- When CDN is selected, do not import runtime code from `@tonder.io/web-sdk`; use `window.Tonder` at runtime. If TypeScript types are requested, install `@tonder.io/web-sdk` only as a devDependency and use `import type`, or add a minimal ambient declaration.
- Do not edit code until all missing required decisions are answered: target page/component, flow, presentation mode when applicable, and SDK loading strategy when applicable. Ask one question at a time, and include a one-sentence explanation of what the decision means and how it changes the integration.
- Do not call MCP recipes using guessed required values. For hosted-auth flows, `presentation_mode` must be user-provided before calling `get_integration_recipe`.
- Final response must not imply the integration is production-ready until the developer has configured API key and SDK environment through app config, required secure token, return URL, production CDN/environment values, Tonder dashboard webhooks, and backend/webhook reconciliation.
