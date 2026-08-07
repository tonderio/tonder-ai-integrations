#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import {
  getErrorReference,
  getIntegrationRecipe,
  getMigrationGuide,
  getPaymentStatusReference,
  getSdkApiReference,
  listResourceUris,
  readResource,
} from './docs-registry.js';

const server = new McpServer(
  { name: 'tonder-mcp', version: '0.1.0' },
  {
    instructions:
      'Use this server only for public Tonder Web SDK integration guidance. Do not infer or disclose private Tonder endpoints, headers, backend payloads, service names, credentials, source maps, or SDK internals.',
  }
);

const resourceUris = listResourceUris();
// `sections/readme` also ends with `/readme`, so exclude section URIs explicitly.
const readmeUri = resourceUris.find((value) => !value.includes('/sections/') && value.endsWith('/readme'));
if (!readmeUri) {
  throw new Error('No Web SDK README resource found in the bundled docs snapshot.');
}

server.registerResource(
  'tonder-web-sdk-readme',
  readmeUri,
  {
    title: 'Tonder Web SDK README',
    description: 'Full Tonder Web SDK README snapshot.',
    mimeType: 'text/markdown',
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readResource(uri.href) }],
  })
);

for (const uri of resourceUris.filter((value) => value.includes('/sections/'))) {
  const name = uri.split('/').at(-1) ?? uri;
  server.registerResource(
    `tonder-web-sdk-${name}`,
    uri,
    {
      title: `Tonder Web SDK ${name}`,
      description: `Tonder Web SDK documentation section: ${name}`,
      mimeType: 'text/markdown',
    },
    async (resourceUri) => ({
      contents: [{ uri: resourceUri.href, mimeType: 'text/markdown', text: readResource(resourceUri.href) }],
    })
  );
}

server.registerTool(
  'get_sdk_api_reference',
  {
    description: 'Return a focused public Tonder SDK API reference section by topic. Does not expose private Tonder internals.',
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
      topic: z.string(),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getSdkApiReference(input), null, 2) }] })
);

server.registerTool(
  'get_integration_recipe',
  {
    description: 'Return a public integration recipe for a Tonder Web SDK framework, flow, and presentation mode. Does not expose private Tonder internals.',
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
      framework: z.enum(['html', 'react', 'angular']),
      flow: z.enum(['card_payment', 'enroll_card', 'saved_cards', 'payment_methods', 'safetypay_banks', 'apple_pay']),
      presentation_mode: z.enum(['embedded', 'redirect']),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getIntegrationRecipe(input), null, 2) }] })
);

server.registerTool(
  'get_error_reference',
  {
    description: 'Return public Tonder Web SDK error reference and remediation guidance. Does not expose private Tonder internals.',
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
      topic: z.string().default('errors'),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getErrorReference(input), null, 2) }] })
);

server.registerTool(
  'get_payment_status_reference',
  {
    description: 'Return public Tonder Web SDK payment statuses and fulfillment guidance. Does not expose private Tonder internals.',
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getPaymentStatusReference(input), null, 2) }] })
);

server.registerTool(
  'get_migration_guide',
  {
    description:
      "Return the migration guide for a merchant who already integrates Tonder and is moving to the Web SDK. Call this INSTEAD of get_integration_recipe when the project already has a Tonder integration: 'direct_api' for a server-to-server Direct API merchant, 'legacy_sdk' for one on tonder-web-sdk v2 (InlineCheckout or LiteInlineCheckout). Does not expose private Tonder internals.",
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
      from: z.enum(['direct_api', 'legacy_sdk']),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getMigrationGuide(input), null, 2) }] })
);

server.registerPrompt(
  'migrate-to-web-sdk',
  {
    description: 'Migrate an existing Tonder integration to the Web SDK.',
    argsSchema: z.object({ from: z.enum(['direct_api', 'legacy_sdk']) }),
  },
  ({ from }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Migrate this project from ${from === 'direct_api' ? 'server-to-server Direct API' : 'the legacy Tonder SDK'} to the Tonder Web SDK. Call get_migration_guide with from '${from}' first and follow it. Inspect what the project actually has before changing anything, and never leave the old integration loaded alongside the new one.`,
        },
      },
    ],
  })
);

server.registerPrompt(
  'integrate-web-sdk-card-payment',
  {
    description: 'Prompt for integrating Tonder Web SDK card payments.',
    argsSchema: z.object({
      framework: z.enum(['html', 'react', 'angular']),
      presentation_mode: z.enum(['embedded', 'redirect']),
    }),
  },
  ({ framework, presentation_mode }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Use the Tonder Web SDK integrator to add ${presentation_mode} card payments to this ${framework} project. Use get_integration_recipe for the authoritative recipe before editing.`,
        },
      },
    ],
  })
);

server.registerPrompt(
  'integrate-web-sdk-saved-cards',
  {
    description: 'Prompt for integrating Tonder Web SDK saved-card payments.',
    argsSchema: z.object({ framework: z.enum(['html', 'react', 'angular']) }),
  },
  ({ framework }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Use the Tonder Web SDK integrator to add saved-card payments to this ${framework} project. Confirm secure_token source before implementation.`,
        },
      },
    ],
  })
);

server.registerPrompt(
  'integrate-web-sdk-apple-pay',
  {
    description: 'Prompt for integrating the Tonder Web SDK Apple Pay button component.',
    argsSchema: z.object({ framework: z.enum(['html', 'react', 'angular']) }),
  },
  ({ framework }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Use the Tonder Web SDK integrator to add the Apple Pay button to this ${framework} project. Apple Pay is a mountable component, not a pay() call: check isApplePayAvailable() before rendering, mount tonder.create('apple_pay_button', { payment }), read results from config.events.payment, and unmount on teardown. Call get_integration_recipe with flow apple_pay before editing.`,
        },
      },
    ],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
