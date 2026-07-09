import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getIntegrationRecipe, getPaymentStatusReference, getSdkApiReference, listResourceUris } from '../docs-registry.js';
import { PUBLIC_DOCS_BOUNDARY, findRestrictedContent } from '../security-policy.js';


function listMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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


  it('includes the public docs security boundary in tool output', () => {
    const reference = getSdkApiReference({ sdk: 'web-sdk', topic: 'pay' });
    expect(reference.content).toContain(PUBLIC_DOCS_BOUNDARY);
  });

  it('does not ship restricted private Tonder content in bundled docs', () => {
    const docsRoot = path.resolve(__dirname, '../../docs/web-sdk');
    const findings = listMarkdownFiles(docsRoot).flatMap((filePath) =>
      findRestrictedContent(readFileSync(filePath, 'utf8')).map((finding) => ({ filePath, ...finding }))
    );

    expect(findings).toEqual([]);
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
