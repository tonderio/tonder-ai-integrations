## Configuration

`createTonder(config)` creates one SDK instance for one shopper/session. Recreate the SDK if the customer, `secure_token`, or environment changes.

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  presentation_mode: 'embedded',
  session: {
    customer: {
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone: '+525500000000',
    },
    secure_token: await getSecureTokenFromYourBackend(),
  },
  events: {
    presentation: {
      on_open: () => console.log('Hosted payment view opened'),
      on_close: () => console.log('Shopper closed the hosted payment view'),
    },
  },
  customization: {
    card_fields: {
      labels: {
        card_number: 'Card number',
        cvv: 'Security code',
      },
      placeholders: {
        card_number: '4111 1111 1111 1111',
        expiration_month: 'MM',
        expiration_year: 'YY',
      },
      error_messages: {
        required: 'Complete this field.',
        invalid: 'Check this field.',
        card_number: 'Enter a valid card number.',
        cvv: 'Enter the security code.',
      },
    },
  },
});
```

| Field                            | Required                               | Description                                                                                                    |
| -------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `api_key`                        | Yes                                    | Public Tonder key for browser integrations.                                                                    |
| `environment`                    | Yes                                    | `'sandbox'`, `'stage'`, or `'production'`.                                                                     |
| `session.customer`               | For `pay()` and saved-card operations  | Customer identity. Omit for read-only return pages that only call `getTransaction()`.                          |
| `session.secure_token`           | For saved-card/Card-on-File operations | Short-lived token minted by your backend. See [Backend secure token endpoint](#backend-secure-token-endpoint). |
| `presentation_mode`              | No                                     | `'redirect'` by default, or `'embedded'` for SDK-owned modal presentation.                                     |
| `events.payment`                 | No                                     | Payment-result callbacks. See below.                                                                           |
| `events.presentation`            | No                                     | Hosted-view callbacks. See below.                                                                              |
| `customization.card_fields`      | No                                     | Labels, placeholders, styles, and validation-message overrides for secure card fields.                         |
| `customization.apple_pay_button` | No                                     | Type, style, locale, height, and corner radius for the SDK-rendered Apple Pay button.                          |

### Events

`events.payment` fires for **every** payment the SDK completes — `pay()` and the Apple Pay button alike. One set of handlers covers every method you offer. For `pay()` these callbacks run alongside the returned promise rather than replacing it; for Apple Pay there is no promise, so they are the only channel.

| Callback                                   | When                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `events.payment.on_completed(transaction)` | The charge reached a final state — **including a decline**. Branch on `transaction.status`. |
| `events.payment.on_error(error)`           | The charge failed operationally and no transaction exists.                                  |
| `events.payment.on_cancel()`               | The shopper dismissed the payment sheet.                                                    |

`events.presentation` fires for the SDK's own hosted views, and only in `presentation_mode: 'embedded'`.

| Callback                         | When                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `events.presentation.on_open()`  | An embedded hosted-payment view has mounted.                                                                            |
| `events.presentation.on_close()` | The shopper closed a closable embedded view. Not called for card 3DS, which is non-closable, nor on programmatic close. |

`on_completed` meaning "final", not "paid", is the distinction that costs the most: a checkout that fulfills on every `on_completed` call ships declines as completed orders.

**A callback of yours that throws cannot change a payment.** Every callback you hand the SDK — `events.payment`, `events.presentation`, and the per-field `events` on `create('card_fields', ...)` — runs in isolation. If one throws, the SDK reports it through `console.warn` and carries on: the `pay()` promise still resolves with the same transaction, and the SDK's own work after the callback still runs. A broken analytics line cannot turn a completed charge into a rejected promise you would be tempted to retry.

### The config is copied when the instance is created

The SDK takes its own copy of the object you pass to `createTonder()`. Everything in it is fixed from that point on: keeping a reference and writing to it afterwards changes nothing the SDK sends. The write is ignored, not rejected, so nothing throws to tell you it had no effect.

To switch customer, refresh an expired `secure_token`, change environment, or change any other setting, create a new instance.

### Card field customization

Configure secure card-field copy and styles through `customization.card_fields` in `createTonder()`. All fields are optional; omitted values use the SDK defaults.

#### `customization.card_fields`

| Field            | Type                     | Required | Description                                                                            |
| ---------------- | ------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `labels`         | `CardLabels`             | No       | Text shown above each secure field.                                                    |
| `placeholders`   | `CardPlaceholders`       | No       | Placeholder text shown inside each secure field.                                       |
| `styles`         | `CardStyles`             | No       | Global and per-field style overrides for secure fields, labels, errors, and card icon. |
| `error_messages` | `CardFieldErrorMessages` | No       | Validation-message overrides for empty or invalid fields.                              |

#### Labels

| Field              | Type     | Description                                            |
| ------------------ | -------- | ------------------------------------------------------ |
| `cardholder_name`  | `string` | Label for the cardholder-name field.                   |
| `card_number`      | `string` | Label for the card-number field.                       |
| `cvv`              | `string` | Label for the CVV field.                               |
| `expiry_date`      | `string` | Label for a combined expiry-date field when supported. |
| `expiration_month` | `string` | Label for the expiration-month field.                  |
| `expiration_year`  | `string` | Label for the expiration-year field.                   |

#### Placeholders

| Field              | Type     | Description                                 |
| ------------------ | -------- | ------------------------------------------- |
| `cardholder_name`  | `string` | Placeholder for the cardholder-name field.  |
| `card_number`      | `string` | Placeholder for the card-number field.      |
| `cvv`              | `string` | Placeholder for the CVV field.              |
| `expiration_month` | `string` | Placeholder for the expiration-month field. |
| `expiration_year`  | `string` | Placeholder for the expiration-year field.  |

#### Styles

`styles.card_form` defines defaults for every secure field. Per-field style entries override those defaults only for that field.

| Field              | Type          | Description                                                                   |
| ------------------ | ------------- | ----------------------------------------------------------------------------- |
| `card_form`        | `FieldStyles` | Default styles applied to every field.                                        |
| `cardholder_name`  | `FieldStyles` | Overrides for the cardholder-name field.                                      |
| `card_number`      | `FieldStyles` | Overrides for the card-number field.                                          |
| `cvv`              | `FieldStyles` | Overrides for the CVV field.                                                  |
| `expiration_month` | `FieldStyles` | Overrides for the expiration-month field.                                     |
| `expiration_year`  | `FieldStyles` | Overrides for the expiration-year field.                                      |
| `enable_card_icon` | `boolean`     | Shows the card-network icon inside the card-number field. Defaults to `true`. |

`FieldStyles` accepts these groups:

| Field          | Type                 | Description                         |
| -------------- | -------------------- | ----------------------------------- |
| `input_styles` | `CollectInputStyles` | Styles applied to the secure input. |
| `label_styles` | `LabelStyles`        | Styles applied to the field label.  |
| `error_styles` | `ErrorTextStyles`    | Styles applied to validation text.  |

`CollectInputStyles` variants:

| Variant    | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `base`     | Default input style.                                           |
| `focus`    | Style applied while the field is focused.                      |
| `complete` | Style applied when the field is complete.                      |
| `invalid`  | Style applied when the field is invalid.                       |
| `empty`    | Style applied when the field is empty.                         |
| `global`   | Global input style overrides supported by the secure renderer. |
| `cardIcon` | Style overrides for the card-network icon when supported.      |

`LabelStyles` variants:

| Variant            | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `base`             | Default label style.                                            |
| `global`           | Global label style overrides supported by the secure renderer.  |
| `requiredAsterisk` | Style overrides for the required-field asterisk when supported. |

`ErrorTextStyles` variants:

| Variant  | Description                                                                 |
| -------- | --------------------------------------------------------------------------- |
| `base`   | Default validation-message style.                                           |
| `global` | Global validation-message style overrides supported by the secure renderer. |

Style values use CSS-in-JS keys supported by the secure card-field renderer, for example `font_size`, `font_family`, `color`, `border_color`, or `letter_spacing`.

`customization.card_fields.styles` styles SDK-rendered content inside the secure iframe, including the secure input, label, validation message, and card icon. Keep merchant layout constraints for the mount containers in CSS, for example `.card-field { width: 100%; max-height: 90px; }`.

#### Error messages

| Field              | Type     | Description                       |
| ------------------ | -------- | --------------------------------- |
| `required`         | `string` | Generic empty-field message.      |
| `invalid`          | `string` | Generic invalid-field fallback.   |
| `cardholder_name`  | `string` | Invalid cardholder-name message.  |
| `card_number`      | `string` | Invalid card-number message.      |
| `expiration_month` | `string` | Invalid expiration-month message. |
| `expiration_year`  | `string` | Invalid expiration-year message.  |
| `cvv`              | `string` | Invalid CVV message.              |

#### Example

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  customization: {
    card_fields: {
      labels: {
        card_number: 'Card number',
        cvv: 'Security code',
      },
      placeholders: {
        cardholder_name: 'Ada Lovelace',
        card_number: '4111 1111 1111 1111',
        expiration_month: 'MM',
        expiration_year: 'YY',
      },
      styles: {
        card_form: {
          input_styles: {
            base: {
              color: '#111827',
              font_family: 'Inter, sans-serif',
              font_size: '16px',
            },
            focus: { border_color: '#2563eb' },
            invalid: { color: '#b91c1c' },
          },
          label_styles: {
            base: { color: '#374151', font_weight: '600' },
          },
          error_styles: {
            base: { color: '#b91c1c' },
          },
        },
        card_number: {
          input_styles: {
            base: { letter_spacing: '0.03em' },
          },
        },
        enable_card_icon: true,
      },
      error_messages: {
        required: 'Complete this field.',
        invalid: 'Check this field.',
        card_number: 'Enter a valid card number.',
        cvv: 'Enter the security code.',
      },
    },
  },
});
```

### Apple Pay button customization

The Apple Pay button is not styled like the rest of your checkout. Safari draws it natively, and Apple allows exactly four things to be changed: **its call to action, its color, its size, and its corner radius.** Nothing else reaches it — not `background-color`, not `color`, not `font-family`, not a logo of your own.

Those four are what `customization.apple_pay_button` exposes, plus the label's language. Set them in `createTonder()`; all are optional.

```ts
customization: {
  apple_pay_button: {
    type: 'check-out',
    style: 'white-outline',
    locale: 'es-MX',
    width: '100%',
    height: '48px',
    border_radius: '8px',
  },
}
```

#### `customization.apple_pay_button`

| Field           | Type     | Default             | Description                                                                         |
| --------------- | -------- | ------------------- | ----------------------------------------------------------------------------------- |
| `type`          | `string` | `buy`               | The button's call to action. See [Button types](#button-types).                     |
| `style`         | `string` | `black`             | `black`, `white`, or `white-outline`.                                               |
| `locale`        | `string` | the page's language | BCP 47 language tag for the label, for example `es-MX`.                             |
| `width`         | `string` | Apple's width       | Any CSS length. See [Sizing](#sizing).                                              |
| `height`        | `string` | Apple's height      | Any CSS length, for example `48px`. See [Sizing](#sizing).                          |
| `border_radius` | `string` | `4pt`               | A single CSS length. `0` gives square corners; a large value gives a capsule shape. |

`border_radius` takes one value only. Apple's button has a single corner radius, so if several are supplied it applies the largest to all four corners.

#### Button types

Apple added these over successive Apple Pay on the Web versions. If the shopper's Safari does not recognize the value, Apple substitutes the plain button rather than failing, so a newer type degrades instead of breaking.

| Introduced in | Values                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| Version 2     | `buy`, `donate`, `plain`, `set-up`                                               |
| Version 4     | `book`, `check-out`, `subscribe`                                                 |
| Version 10    | `add-money`, `contribute`, `order`, `reload`, `rent`, `support`, `tip`, `top-up` |
| Version 12    | `continue`                                                                       |

`plain` shows the Apple Pay mark alone. Every other type prepends a call to action, for example "Check out with Pay".

#### Sizing

`width` and `height` accept any CSS length, but Apple enforces a floor:

| Button                           | Minimum width | Minimum height |
| -------------------------------- | ------------- | -------------- |
| `plain`                          | 100pt         | 30pt           |
| Every type with a call to action | 140pt         | 30pt           |

Apple states these in points. A percentage width such as `100%` resolves against your container, so it is you who has to keep the result above the floor — a full-width button inside a narrow column can fall under 140pt without your CSS ever naming a small number.

Apple also asks for clear space around the button of at least 1/10 of its height. Leave that room in your own layout — it is the container's margin, not a button property.

**`width` and `locale` interact.** If the width you choose cannot fit the label once Apple translates it, Apple replaces your button with the plain one, silently. A width that fits "Check out with Pay" in English may not fit its Spanish translation, so check any narrow button in every locale you ship.

#### The logo cannot be replaced

There is no image, icon, or logo option, and this is not an SDK limitation. The button is drawn by the browser through `-webkit-appearance: -apple-pay-button` rather than an `<img>`, so the Apple Pay mark comes from WebKit itself. Apple's Human Interface Guidelines require the unmodified mark, and custom artwork is grounds for rejection when you register your domain. Use `type` to change what the button says.
