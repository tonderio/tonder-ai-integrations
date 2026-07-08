---
name: tonder-web-sdk-integrator
description: Use when integrating the Tonder Web SDK into a merchant web project. Supports browser-based web apps including vanilla HTML, React, Next.js, Angular, and similar frameworks; card payments, card enrollment, saved cards, payment methods, SafetyPay banks, embedded or redirect presentation, CDN or npm setup, and validation that raw card data is not handled by merchant code. Requires the bundled tonder-docs MCP server as the integration source of truth.
---

# Tonder Web SDK Integrator

Integrate the Tonder Web SDK into the user's project using the public SDK contract and the smallest safe implementation for the selected framework and payment flow.

## Source of truth

Use the bundled `tonder-docs` MCP server as the only documentation source for implementation details.

Before editing, call the MCP tools needed for the selected work:

- `get_integration_recipe` for the selected framework, flow, and presentation mode.
- `get_sdk_api_reference` for method signatures, payloads, CDN/npm setup, and customization details.
- `get_error_reference` when adding error handling or explaining SDK errors.
- `get_payment_status_reference` when handling or explaining payment statuses.

If `tonder-docs` MCP is unavailable or does not return the required information, stop and report the blocker. Do not use local copies of SDK docs, sibling repos, or improvised examples as a fallback.

## Workflow

1. Inspect the project before asking questions.
2. Detect framework:
   - HTML/static page
   - React
   - Angular
   - If detection is ambiguous, ask the user to confirm.
3. Confirm the target page/component before editing when the project has multiple plausible checkout pages, routes, or components. Stop and ask one question. Explain that this decides where the checkout UI and SDK lifecycle code will be added.
4. Confirm the integration flow if the prompt does not specify one. Stop and ask one question. Explain the relevant choices briefly:
   - card payment: shopper enters a new card in secure SDK fields and pays now.
   - enroll card: shopper saves a new card for future payments.
   - saved cards: shopper pays with an existing saved card, sometimes with CVV collection.
   - payment methods: shopper pays with an alternative method such as SPEI or OXXO Pay.
   - SafetyPay banks: shopper selects a SafetyPay bank for cash/transfer flows.
5. Confirm presentation mode if the flow can require hosted authentication and the user did not specify it. Stop and ask one question before editing; do not choose a default. Explain both choices in the question:
   - `embedded`: Tonder opens the hosted authentication/checkout step in an SDK modal/iframe inside the merchant page.
   - `redirect`: the browser navigates to the hosted step and returns to the provided `return_url`.
6. Confirm SDK loading strategy unless the user already specified it. Stop and ask one question before editing; do not choose a default for React/Angular/bundled apps. Explain both choices in the question. For a plain static HTML page, CDN may be inferred only when there is no package manager or bundler:
   - `cdn`: add the Tonder browser script URL directly to the page; best for plain HTML or when the developer does not want a package dependency.
   - `npm`: install/import the public SDK package through the app bundler; best for typed React/Angular projects once the public package is available.
   - If npm is unavailable or not published, use the documented CDN path instead; do not search for or install local SDK packages.
7. If CDN is selected for a TypeScript project such as React or Angular, confirm the typing strategy unless the user already specified it. Stop and ask one question. Explain that CDN provides the runtime through `window.Tonder`, but TypeScript still needs a type declaration:
   - type-only devDependency: install `@tonder.io/web-sdk` with `-D` and use `import type` only; runtime still comes from the CDN.
   - local ambient declaration: add a minimal `window.Tonder` declaration without installing the npm package.
   For plain HTML/JavaScript projects, skip this question.
8. Ask whether the developer wants the default Tonder UX/configuration or custom SDK options, unless already specified. Stop and ask one question. Explain that defaults use Tonder-provided secure-field labels, placeholders, styles, validation messages, and basic presentation behavior; custom options can include secure-field labels/placeholders/error messages/styles, `events.presentation.on_open`, `events.presentation.on_close`, `idempotency_key`, metadata, card-field event callbacks, or custom container IDs. If they choose defaults, do not add customization code. If they choose custom options, ask for only the relevant details one at a time.
9. After all required decisions are known, use `tonder-docs` MCP to load the selected recipe/API reference. Do not call `get_integration_recipe` with an assumed `presentation_mode`; for card or saved-card flows, the value must come from the user prompt or from a direct user answer.
10. Implement only the selected flow and required UI/state.
11. Validate that the integration does not collect raw card data in merchant code.
12. Add minimal merchant-facing notes for backend reconciliation and webhooks.
13. Run available typecheck/build/test commands when safe.
14. Final response must include: changed files, validation run, documentation source used, and setup notes telling the developer to configure their Tonder public API key, keep the generated `idempotency_key` stable per checkout attempt to make retries safe, configure webhooks in the Tonder dashboard before fulfillment, and update environment/CDN values when moving from stage/sandbox to production. If CDN with type-only npm was selected, say that `@tonder.io/web-sdk` is a devDependency for TypeScript types only and the runtime still comes from the CDN. If the selected flow needs saved cards or enrollment, also mention `secure_token`. If an alert or temporary shopper message was added, explicitly say it is only the UI handoff point and the merchant should replace/adapt it to their checkout UX; it is not fulfillment authority.

## Required MCP usage by task

| Task | Required MCP calls before editing |
| ---- | --------------------------------- |
| Card payment | `get_integration_recipe`, `get_sdk_api_reference` for `pay`, `card_fields`, and CDN/npm setup |
| Enroll card | `get_integration_recipe`, `get_sdk_api_reference` for `enrollCard`, `card_fields`, customer/session credentials |
| Saved cards | `get_integration_recipe`, `get_sdk_api_reference` for `getCustomerCards`, saved-card payment, CVV/card fields |
| Payment methods | `get_integration_recipe`, `get_sdk_api_reference` for `getPaymentMethods` and `pay` |
| SafetyPay banks | `get_integration_recipe`, `get_sdk_api_reference` for `getPaymentMethodBanks`, SafetyPay config, and `pay` |
| Error/status handling | `get_error_reference`, `get_payment_status_reference` |

## Hard rules

- Never create card number, expiration, or CVV `<input>` elements in merchant code for card collection.
- Use secure SDK-rendered card fields for new cards and CVV collection.
- Do not add merchant-owned labels, input borders, padding, or field-card wrappers around SDK secure-field containers; the SDK renders labels, inputs, validation, and errors inside the secure iframe. Merchant CSS may only control layout such as width, max-height, margin, grid, or gap. When creating secure-field containers, use `.card-field { width: 100%; max-height: 90px; }` unless the app already has equivalent layout styles. `customization.card_fields.styles` may style the SDK-rendered secure input, label, error, and icon inside the iframe, including input-level sizing when supported by the SDK renderer. It does not replace the merchant CSS needed to cap the mount container height while the iframe initializes; keep container sizing such as `.card-field { width: 100%; max-height: 90px; }` in merchant CSS.
- For Angular CDN/global SDK integrations, use Angular `signal()` state for loading/status UI or call `ChangeDetectorRef.detectChanges()` after SDK promises/callbacks. `NgZone.run(...)` alone may not update zoneless Angular apps.
- Keep public payload fields in snake_case.
- Require `client_reference` for payments.
- Pass `return_url` in `pay()` when hosted authentication or redirect completion may be needed.
- Do not treat browser success as fulfillment authority; mention backend/webhook reconciliation.
- Do not add permanent raw JSON `<pre>` result dumps unless the user explicitly asks for demo/debug output. For generic examples, use a simple `alert()` with `transaction.status` and a code comment that this is the handoff point for the merchant's real checkout UX.
- In React examples, do not create generic `result`/`setResult` state or render `<p className="result">{result}</p>`. Use `status`/`setStatus` only for setup/progress/error copy; show the payment result through the alert handoff unless the existing app already has its own result/toast system.
- Always include `idempotency_key` in payment calls, with a short code comment explaining that it should be stable per checkout attempt so retries do not create duplicate charges. Do not reuse `client_reference` as the idempotency key.
- Do not add SDK customization, presentation callbacks, metadata, card-field event callbacks, or custom container IDs unless the user requests them or the existing project clearly requires them.
- Do not store API keys, secure tokens, customer data, or card data in generated files beyond placeholder/demo values.
- Do not search parent/sibling folders for `tonder-js`, local SDK packages, or monorepo workspaces. The developer project is the only editable project.
- Do not install `file:../tonder-js`, `link:`, or sibling workspace packages. If npm is unavailable, use the documented CDN integration instead.
- When CDN is selected, do not import runtime code from `@tonder.io/web-sdk`; use `window.Tonder` at runtime. If TypeScript types are requested, install `@tonder.io/web-sdk` only as a devDependency and use `import type`, or add a minimal ambient declaration.
- Do not edit code until all missing required decisions are answered: target page/component, flow, presentation mode when applicable, and SDK loading strategy when applicable. Ask one question at a time, and include a one-sentence explanation of what the decision means and how it changes the integration.
- Do not call MCP recipes using guessed required values. For hosted-auth flows, `presentation_mode` must be user-provided before calling `get_integration_recipe`.
- Final response must not imply the integration is production-ready until the developer has configured API key, required secure token, return URL, production CDN/environment values, Tonder dashboard webhooks, and backend/webhook reconciliation.
