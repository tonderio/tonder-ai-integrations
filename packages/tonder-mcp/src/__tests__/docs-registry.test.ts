import { describe, expect, it } from 'vitest';
import { getIntegrationRecipe, getPaymentStatusReference, getSdkApiReference, listResourceUris } from '../docs-registry.js';

describe('docs registry', () => {
  it('lists versioned web sdk resources', () => {
    const resources = listResourceUris();
    const version = resources[0].split('/')[3];
    expect(resources).toContain(`tonder://web-sdk/${version}/readme`);
    expect(resources).toContain(`tonder://web-sdk/${version}/sections/pay`);
  });

  it('returns API reference content by topic', () => {
    const reference = getSdkApiReference({ sdk: 'web-sdk', version: '0.1.0', topic: 'pay' });
    expect(reference.title).toContain('pay');
    expect(reference.content).toContain('client_reference');
  });

  it('returns a card payment recipe', () => {
    const recipe = getIntegrationRecipe({ sdk: 'web-sdk', version: '0.1.0', framework: 'react', flow: 'card_payment', presentation_mode: 'embedded' });
    expect(recipe.content).toContain('card_fields');
    expect(recipe.content).toContain('payment_method');
  });

  it('returns a card payment recipe from the default latest docs version', () => {
    const recipe = getIntegrationRecipe({ sdk: 'web-sdk', framework: 'html', flow: 'card_payment', presentation_mode: 'embedded' });
    const resources = listResourceUris();
    expect(resources).toContain(`tonder://web-sdk/${recipe.version}/readme`);
    expect(recipe.content).toContain('card_fields');
    expect(recipe.content).toContain('payment_method');
  });

  it('returns payment status reference', () => {
    const status = getPaymentStatusReference({ sdk: 'web-sdk', version: '0.1.0' });
    expect(status.content).toContain('Success');
    expect(status.content).toContain('Pending');
  });

  it('returns customization reference aliases', () => {
    for (const topic of ['customization', 'styles', 'TonderCustomization']) {
      const reference = getSdkApiReference({ sdk: 'web-sdk', version: '0.1.0', topic });
      expect(reference.title).toContain('Configuration');
      expect(reference.content).toContain('customization.card_fields');
      expect(reference.content).toContain('input_styles');
    }
  });

  it('returns references by content search when topic is not a section title', () => {
    const cases = [
      ['TonderConfig', 'api_key'],
      ['CardPlaceholders', 'placeholder'],
      ['PaymentMethodBank', 'SafetyPay'],
      ['secure_token', 'secure_token'],
      ['SECURE_FIELDS_LOAD_ERROR', 'SECURE_FIELDS_LOAD_ERROR'],
    ];

    for (const [topic, expected] of cases) {
      const reference = getSdkApiReference({ sdk: 'web-sdk', version: '0.1.0', topic });
      expect(reference.content).toContain(expected);
    }
  });
});
