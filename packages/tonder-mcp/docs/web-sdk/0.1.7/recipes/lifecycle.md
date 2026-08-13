Create one SDK instance per shopper/session with `createTonder(config)`.

Do not hardcode real merchant public API keys or fixed SDK environments inside checkout components or scripts. Read those values from the merchant application's public configuration layer.

`currency` is merchant checkout/business data and does not need to be forced into environment variables unless the app already manages it that way.

Call `await tonder.init()` before SDK actions that require merchant configuration.

For new-card flows, render SDK secure-field containers first, then create and mount `card_fields`.
