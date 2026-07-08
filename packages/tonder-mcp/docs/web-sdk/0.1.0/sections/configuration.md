## Configuration

`createTonder(config)` creates one SDK instance for one shopper/session. Recreate the SDK if the customer, `secure_token`, or environment changes.

```ts
const tonder = createTonder({
  api_key: 'pk_test_...',
  environment: 'sandbox',
  presentation_mode: 'embedded',
  session: {
    customer: {
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone: '+525500000000',
    },
    secure_token: 'server_minted_secure_token',
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

| Field                          | Required                              | Description                                                                            |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `api_key`                      | Yes                                   | Public Tonder key for browser integrations.                                            |
| `environment`                  | Yes                                   | `'sandbox'`, `'stage'`, or `'production'`.                                             |
| `session.customer`             | For `pay()` and saved-card operations | Customer identity. Omit for read-only return pages that only call `getTransaction()`.  |
| `session.secure_token`         | For saved-card operations             | Short-lived token minted by your backend.                                              |
| `presentation_mode`            | No                                    | `'redirect'` by default, or `'embedded'` for SDK-owned modal presentation.             |
| `events.presentation.on_open`  | No                                    | Called when an embedded hosted-payment view opens.                                     |
| `events.presentation.on_close` | No                                    | Called when the shopper closes a closable embedded hosted-payment view.                |
| `customization.card_fields`    | No                                    | Labels, placeholders, styles, and validation-message overrides for secure card fields. |

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
  api_key: 'pk_test_...',
  environment: 'sandbox',
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
