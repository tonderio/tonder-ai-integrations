#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsRoot = path.join(__dirname, 'docs');
const defaultVersion = '0.1.0';

function docDir(sdk = 'web-sdk', version = defaultVersion) {
  return path.join(docsRoot, sdk, version);
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function loadManifest(sdk = 'web-sdk', version = defaultVersion) {
  return JSON.parse(readText(path.join(docDir(sdk, version), 'manifest.json')));
}

function normalizeTopic(topic) {
  return String(topic).toLowerCase().replace(/[`'"()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getRecipeText(version, fileName) {
  const recipePath = path.join(docDir('web-sdk', version), 'recipes', fileName);
  return existsSync(recipePath) ? readText(recipePath) : '';
}

function findSectionPath(topic, sdk = 'web-sdk', version = defaultVersion) {
  const normalized = normalizeTopic(topic);
  const manifest = loadManifest(sdk, version);
  if (manifest.sections[normalized]) return { key: normalized, ...manifest.sections[normalized] };

  const aliases = {
    pay: ['payment-request-and-processing', 'tonder-payinput', '2-initialize-mount-and-pay', 'quick-start-card-payment'],
    card_fields: ['tonder-createcard-fields-options', 'card-fields-mount', 'quick-start-card-payment'],
    card_payment: ['quick-start-card-payment', '2-initialize-mount-and-pay', 'payment-request-and-processing', 'tonder-payinput'],
    enroll_card: ['tonder-enrollcard', 'save-a-new-card'],
    saved_cards: ['saved-card', 'tonder-getcustomercards'],
    payment_methods: ['alternative-payment-methods', 'tonder-getpaymentmethods', 'payment-method-discovery'],
    safetypay_banks: ['tonder-getpaymentmethodbanks', 'alternative-payment-methods'],
    errors: ['errors'],
    statuses: ['payment-statuses'],
    webhooks: ['webhooks'],
    init: ['tonder-init', 'initialization'],
    createTonder: ['createtonderconfig'],
    cdn: ['cdn-build', 'install'],
    npm: ['install'],
  };

  for (const candidate of aliases[topic] ?? aliases[normalized] ?? []) {
    if (manifest.sections[candidate]) return { key: candidate, ...manifest.sections[candidate] };
  }

  const fuzzy = Object.entries(manifest.sections).find(([key, value]) =>
    key.includes(normalized) || value.title.toLowerCase().includes(String(topic).toLowerCase())
  );
  if (fuzzy) return { key: fuzzy[0], ...fuzzy[1] };

  throw new Error(`No Web SDK docs section found for topic: ${topic}`);
}

function getSdkApiReference({ sdk = 'web-sdk', version = defaultVersion, topic }) {
  const section = findSectionPath(topic, sdk, version);
  const content = readText(path.join(docDir(sdk, version), section.path));
  const extraForPay = topic === 'pay' ? `\n\n${getRecipeText(version, 'flows.md')}` : '';
  return {
    sdk,
    version,
    topic,
    title: topic === 'pay' ? 'pay' : section.title,
    uri: `tonder://${sdk}/${version}/sections/${topic === 'pay' ? 'pay' : section.key}`,
    content: content + extraForPay,
  };
}

function getPaymentStatusReference({ sdk = 'web-sdk', version = defaultVersion } = {}) {
  const section = findSectionPath('statuses', sdk, version);
  return {
    sdk,
    version,
    title: section.title,
    uri: `tonder://${sdk}/${version}/sections/${section.key}`,
    content: readText(path.join(docDir(sdk, version), section.path)),
  };
}

function getErrorReference({ sdk = 'web-sdk', version = defaultVersion, topic = 'errors' } = {}) {
  const section = findSectionPath(topic, sdk, version);
  return {
    sdk,
    version,
    title: section.title,
    uri: `tonder://${sdk}/${version}/sections/${section.key}`,
    content: readText(path.join(docDir(sdk, version), section.path)),
  };
}

function getIntegrationRecipe({ sdk = 'web-sdk', version = defaultVersion, framework, flow, presentation_mode }) {
  if (!presentation_mode) {
    throw new Error('presentation_mode is required. Ask the user for embedded or redirect before requesting a recipe.');
  }
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

function listResourceUris(sdk = 'web-sdk', version = defaultVersion) {
  const manifest = loadManifest(sdk, version);
  return [
    `tonder://${sdk}/${version}/readme`,
    ...Object.keys(manifest.sections).map((key) => `tonder://${sdk}/${version}/sections/${key}`),
  ];
}

function readResource(uri) {
  const match = uri.match(/^tonder:\/\/(web-sdk)\/([^/]+)\/(readme|sections\/(.+))$/);
  if (!match) throw new Error(`Unsupported resource URI: ${uri}`);
  const [, sdk, version, kind, section] = match;
  if (kind === 'readme') return readText(path.join(docDir(sdk, version), 'README.md'));
  const manifest = loadManifest(sdk, version);
  const entry = section ? manifest.sections[section] : undefined;
  if (!entry) throw new Error(`Unknown section resource: ${uri}`);
  return readText(path.join(docDir(sdk, version), entry.path));
}

const toolDefinitions = [
  {
    name: 'get_sdk_api_reference',
    description: 'Return a focused Tonder SDK API reference section by topic.',
    inputSchema: {
      type: 'object',
      properties: {
        sdk: { type: 'string', enum: ['web-sdk'], default: 'web-sdk' },
        version: { type: 'string', default: '0.1.0' },
        topic: { type: 'string' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'get_integration_recipe',
    description: 'Return an integration recipe for a Tonder Web SDK framework, flow, and presentation mode.',
    inputSchema: {
      type: 'object',
      properties: {
        sdk: { type: 'string', enum: ['web-sdk'], default: 'web-sdk' },
        version: { type: 'string', default: '0.1.0' },
        framework: { type: 'string', enum: ['html', 'react', 'angular'] },
        flow: { type: 'string', enum: ['card_payment', 'enroll_card', 'saved_cards', 'payment_methods', 'safetypay_banks'] },
        presentation_mode: { type: 'string', enum: ['embedded', 'redirect'] },
      },
      required: ['framework', 'flow', 'presentation_mode'],
    },
  },
  {
    name: 'get_error_reference',
    description: 'Return Tonder Web SDK error reference and remediation guidance.',
    inputSchema: {
      type: 'object',
      properties: {
        sdk: { type: 'string', enum: ['web-sdk'], default: 'web-sdk' },
        version: { type: 'string', default: '0.1.0' },
        topic: { type: 'string', default: 'errors' },
      },
    },
  },
  {
    name: 'get_payment_status_reference',
    description: 'Return Tonder Web SDK payment statuses and fulfillment guidance.',
    inputSchema: {
      type: 'object',
      properties: {
        sdk: { type: 'string', enum: ['web-sdk'], default: 'web-sdk' },
        version: { type: 'string', default: '0.1.0' },
      },
    },
  },
];

const prompts = [
  {
    name: 'integrate-web-sdk-card-payment',
    description: 'Prompt for integrating Tonder Web SDK card payments.',
    arguments: [
      { name: 'framework', description: 'html, react, or angular', required: true },
      { name: 'presentation_mode', description: 'embedded or redirect', required: true },
    ],
  },
  {
    name: 'integrate-web-sdk-saved-cards',
    description: 'Prompt for integrating Tonder Web SDK saved-card payments.',
    arguments: [{ name: 'framework', description: 'html, react, or angular', required: true }],
  },
];

function ok(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function err(id, error) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } });
}

async function handle(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: params.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'tonder-docs', version: '0.1.0' },
    });
  }
  if (method === 'notifications/initialized') return undefined;
  if (method === 'tools/list') return ok(id, { tools: toolDefinitions });
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;
    const handlers = { get_sdk_api_reference: getSdkApiReference, get_integration_recipe: getIntegrationRecipe, get_error_reference: getErrorReference, get_payment_status_reference: getPaymentStatusReference };
    if (!handlers[name]) throw new Error(`Unknown tool: ${name}`);
    return ok(id, { content: [{ type: 'text', text: JSON.stringify(handlers[name](args), null, 2) }] });
  }
  if (method === 'resources/list') {
    return ok(id, { resources: listResourceUris().map((uri) => ({ uri, name: uri.split('/').at(-1), mimeType: 'text/markdown' })) });
  }
  if (method === 'resources/read') {
    const uri = params.uri;
    return ok(id, { contents: [{ uri, mimeType: 'text/markdown', text: readResource(uri) }] });
  }
  if (method === 'prompts/list') return ok(id, { prompts });
  if (method === 'prompts/get') {
    const { name, arguments: args = {} } = params;
    if (name === 'integrate-web-sdk-card-payment') {
      return ok(id, { messages: [{ role: 'user', content: { type: 'text', text: `Use the Tonder Web SDK integrator to add ${args.presentation_mode} card payments to this ${args.framework} project. Use get_integration_recipe for the authoritative recipe before editing.` } }] });
    }
    if (name === 'integrate-web-sdk-saved-cards') {
      return ok(id, { messages: [{ role: 'user', content: { type: 'text', text: `Use the Tonder Web SDK integrator to add saved-card payments to this ${args.framework} project. Confirm secure_token source before implementation.` } }] });
    }
    throw new Error(`Unknown prompt: ${name}`);
  }
  throw new Error(`Unknown method: ${method}`);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
    const response = await handle(message);
    if (response) process.stdout.write(`${response}\n`);
  } catch (error) {
    process.stdout.write(`${err(message?.id ?? null, error)}\n`);
  }
});
