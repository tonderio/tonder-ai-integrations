import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Sdk = 'web-sdk';
export type Framework = 'html' | 'react' | 'angular';
export type Flow = 'card_payment' | 'enroll_card' | 'saved_cards' | 'payment_methods' | 'safetypay_banks';
export type PresentationMode = 'embedded' | 'redirect';

export interface ReferenceRequest {
  sdk?: Sdk;
  version?: string;
  topic: string;
}

export interface RecipeRequest {
  sdk?: Sdk;
  version?: string;
  framework: Framework;
  flow: Flow;
  presentation_mode: PresentationMode;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(packageRoot, 'docs');

function compareSemverDesc(a: string, b: string) {
  const parse = (value: string) => value.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (right[index] || 0) - (left[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function defaultVersion(sdk: Sdk = 'web-sdk') {
  const sdkDir = path.join(docsRoot, sdk);
  const versions = readdirSync(sdkDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(sdkDir, entry.name, 'manifest.json')))
    .map((entry) => entry.name)
    .sort(compareSemverDesc);

  if (!versions[0]) {
    throw new Error(`No documentation snapshots found for ${sdk}`);
  }

  return versions[0];
}

function docDir(sdk: Sdk = 'web-sdk', version = defaultVersion(sdk)) {
  return path.join(docsRoot, sdk, version);
}

function readText(filePath: string) {
  return readFileSync(filePath, 'utf8');
}

function getRecipeText(version: string, fileName: string) {
  const recipePath = path.join(docDir('web-sdk', version), 'recipes', fileName);
  if (!existsSync(recipePath)) return '';
  return readText(recipePath);
}

function loadManifest(sdk: Sdk = 'web-sdk', version = defaultVersion(sdk)) {
  return JSON.parse(readText(path.join(docDir(sdk, version), 'manifest.json'))) as {
    sections: Record<string, { title: string; path: string }>;
  };
}

function normalizeTopic(topic: string) {
  return topic.toLowerCase().replace(/[`'"()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findSectionPath(topic: string, sdk: Sdk = 'web-sdk', version = defaultVersion(sdk)) {
  const normalized = normalizeTopic(topic);
  const manifest = loadManifest(sdk, version);
  if (manifest.sections[normalized]) {
    return { key: normalized, ...manifest.sections[normalized] };
  }

  const aliases: Record<string, string[]> = {
    pay: ['payment-request-and-processing', 'tonder-payinput', '2-initialize-mount-and-pay', 'quick-start-card-payment'],
    card_fields: ['tonder-createcard-fields-options', 'card-fields-mount', 'quick-start-card-payment'],
    card_payment: ['quick-start-card-payment', '2-initialize-mount-and-pay', 'payment-request-and-processing', 'tonder-payinput'],
    enroll_card: ['tonder-enrollcard', 'save-a-new-card'],
    saved_cards: ['saved-card-payments', 'saved-card', 'tonder-getcustomercards'],
    payment_methods: ['alternative-payment-methods', 'tonder-getpaymentmethods', 'payment-method-discovery'],
    safetypay_banks: ['tonder-getpaymentmethodbanks', 'payment-method-banks-safetypay'],
    errors: ['errors'],
    statuses: ['payment-statuses'],
    webhooks: ['webhooks'],
    init: ['tonder-init', 'initialization', 'configuration', 'api-reference'],
    configuration: ['configuration', 'api-reference'],
    customization: ['configuration', 'api-reference'],
    customisation: ['configuration', 'api-reference'],
    styles: ['configuration', 'api-reference'],
    style: ['configuration', 'api-reference'],
    card_styles: ['configuration', 'api-reference'],
    field_styles: ['configuration', 'api-reference'],
    input_styles: ['configuration', 'api-reference'],
    label_styles: ['configuration', 'api-reference'],
    error_styles: ['configuration', 'api-reference'],
    card_field_customization: ['configuration', 'api-reference'],
    card_fields_customization: ['configuration', 'api-reference'],
    TonderCustomization: ['configuration', 'api-reference'],
    tondercustomization: ['configuration', 'api-reference'],
    CardFieldsCustomization: ['configuration', 'api-reference'],
    cardfieldscustomization: ['configuration', 'api-reference'],
    CardStyles: ['configuration', 'api-reference'],
    cardstyles: ['configuration', 'api-reference'],
    FieldStyles: ['configuration', 'api-reference'],
    fieldstyles: ['configuration', 'api-reference'],
    createTonder: ['createtonderconfig', 'configuration', 'api-reference'],
    getCustomerCards: ['tonder-getcustomercards', 'api-reference'],
    getPaymentMethods: ['tonder-getpaymentmethods', 'api-reference'],
    getPaymentMethodBanks: ['tonder-getpaymentmethodbanks', 'api-reference'],
    getTransaction: ['tonder-gettransactionid', 'api-reference'],
    enrollCard: ['tonder-enrollcard', 'api-reference'],
  };

  for (const candidate of aliases[topic] ?? aliases[normalized] ?? []) {
    if (manifest.sections[candidate]) {
      return { key: candidate, ...manifest.sections[candidate] };
    }
  }

  const fuzzy = Object.entries(manifest.sections).find(([key, value]) => key.includes(normalized) || value.title.toLowerCase().includes(topic.toLowerCase()));
  if (fuzzy) return { key: fuzzy[0], ...fuzzy[1] };

  const contentMatch = Object.entries(manifest.sections)
    .map(([key, value]) => {
      const content = readText(path.join(docDir(sdk, version), value.path));
      const lowerContent = content.toLowerCase();
      const normalizedContent = lowerContent.replace(/[^a-z0-9]+/g, '-');
      const exactCount = lowerContent.split(topic.toLowerCase()).length - 1;
      const normalizedCount = normalizedContent.split(normalized).length - 1;
      const indexPenalty = key === 'contents' || key === 'readme' ? -10 : 0;
      return { key, value, score: exactCount * 3 + normalizedCount + indexPenalty };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)[0];

  if (contentMatch) return { key: contentMatch.key, ...contentMatch.value };

  throw new Error(`No Web SDK docs section found for topic: ${topic}`);
}

export function listResourceUris(sdk: Sdk = 'web-sdk', version = defaultVersion(sdk)) {
  const manifest = loadManifest(sdk, version);
  return [
    `tonder://${sdk}/${version}/readme`,
    ...Object.keys(manifest.sections).map((key) => `tonder://${sdk}/${version}/sections/${key}`),
    `tonder://${sdk}/${version}/sections/pay`,
  ];
}

export function readResource(uri: string) {
  const match = uri.match(/^tonder:\/\/(web-sdk)\/([^/]+)\/(readme|sections\/(.+))$/);
  if (!match) throw new Error(`Unsupported resource URI: ${uri}`);
  const [, sdk, version, kind, section] = match as [string, Sdk, string, string, string | undefined];
  if (kind === 'readme') {
    return readText(path.join(docDir(sdk, version), 'README.md'));
  }
  const manifest = loadManifest(sdk, version);
  const entry = section ? manifest.sections[section] : undefined;
  const resolved = entry ?? (section ? findSectionPath(section, sdk, version) : undefined);
  if (!resolved) throw new Error(`Unknown section resource: ${uri}`);
  return readText(path.join(docDir(sdk, version), resolved.path));
}

export function getSdkApiReference({ sdk = 'web-sdk', version = defaultVersion(sdk), topic }: ReferenceRequest) {
  const section = findSectionPath(topic, sdk, version);
  const content = readText(path.join(docDir(sdk, version), section.path));
  const extraForPay = topic === 'pay' ? '\n\n' + getRecipeText(version, 'flows.md') : '';
  return {
    sdk,
    version,
    topic,
    title: topic === 'pay' ? 'pay' : section.title,
    uri: `tonder://${sdk}/${version}/sections/${topic === 'pay' ? 'pay' : section.key}`,
    content: content + extraForPay,
  };
}

export function getPaymentStatusReference({ sdk = 'web-sdk', version = defaultVersion(sdk) }: { sdk?: Sdk; version?: string }) {
  const section = findSectionPath('statuses', sdk, version);
  return {
    sdk,
    version,
    title: section.title,
    uri: `tonder://${sdk}/${version}/sections/${section.key}`,
    content: readText(path.join(docDir(sdk, version), section.path)),
  };
}

export function getErrorReference({ sdk = 'web-sdk', version = defaultVersion(sdk), topic = 'errors' }: { sdk?: Sdk; version?: string; topic?: string }) {
  const section = findSectionPath(topic, sdk, version);
  return {
    sdk,
    version,
    title: section.title,
    uri: `tonder://${sdk}/${version}/sections/${section.key}`,
    content: readText(path.join(docDir(sdk, version), section.path)),
  };
}

export function getIntegrationRecipe({ sdk = 'web-sdk', version = defaultVersion(sdk), framework, flow, presentation_mode }: RecipeRequest) {
  const frameworkContent = getRecipeText(version, `${framework}.md`);
  const flowContent = getRecipeText(version, 'flows.md') || getSdkApiReference({ sdk, version, topic: flow }).content;
  const lifecycleSection = getSdkApiReference({ sdk, version, topic: 'init' });
  const content = [
    `# Tonder ${sdk} recipe: ${framework} + ${flow}`,
    `Presentation mode: ${presentation_mode}`,
    '## Lifecycle',
    lifecycleSection.content,
    '## Framework pattern',
    frameworkContent,
    '## Flow details',
    flowContent,
    '## Reconciliation rule',
    'Use the browser response for UX only. Fulfillment must be reconciled from the merchant backend using webhooks or server-side transaction lookup.',
  ].join('\n\n');
  return { sdk, version, framework, flow, presentation_mode, content };
}
