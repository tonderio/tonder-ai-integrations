#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import {
  getErrorReference,
  getIntegrationRecipe,
  getPaymentStatusReference,
  getSdkApiReference,
  listResourceUris,
  readResource,
} from './docs-registry.js';

const server = new McpServer({ name: 'tonder-mcp', version: '0.1.0' });

server.registerResource(
  'tonder-web-sdk-readme',
  'tonder://web-sdk/0.1.0/readme',
  {
    title: 'Tonder Web SDK README',
    description: 'Full Tonder Web SDK README snapshot.',
    mimeType: 'text/markdown',
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readResource(uri.href) }],
  })
);

for (const uri of listResourceUris().filter((value) => value.includes('/sections/'))) {
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
    description: 'Return a focused Tonder SDK API reference section by topic.',
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
    description: 'Return an integration recipe for a Tonder Web SDK framework, flow, and presentation mode.',
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
      framework: z.enum(['html', 'react', 'angular']),
      flow: z.enum(['card_payment', 'enroll_card', 'saved_cards', 'payment_methods', 'safetypay_banks']),
      presentation_mode: z.enum(['embedded', 'redirect']),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getIntegrationRecipe(input), null, 2) }] })
);

server.registerTool(
  'get_error_reference',
  {
    description: 'Return Tonder Web SDK error reference and remediation guidance.',
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
    description: 'Return Tonder Web SDK payment statuses and fulfillment guidance.',
    inputSchema: z.object({
      sdk: z.literal('web-sdk').default('web-sdk'),
      version: z.string().optional(),
    }),
  },
  async (input) => ({ content: [{ type: 'text', text: JSON.stringify(getPaymentStatusReference(input), null, 2) }] })
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

const transport = new StdioServerTransport();
await server.connect(transport);
