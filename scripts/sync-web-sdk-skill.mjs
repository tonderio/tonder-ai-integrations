#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncPluginVersions } from './sync-plugin-versions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const sourceSkill = path.join(root, 'skills', 'tonder-web-sdk-integrator');
const mcpPackageRoot = path.join(root, 'packages', 'tonder-mcp');
const mcpDist = path.join(mcpPackageRoot, 'dist');
const mcpDocs = path.join(mcpPackageRoot, 'docs');
// Maintained-recipe source directory. The sync script already copied it into the
// generated snapshot, so shipping it again would duplicate it in every plugin.
const maintainedRecipesSource = path.join(mcpDocs, 'web-sdk', 'recipes');
const mcpPackageJson = path.join(mcpPackageRoot, 'package.json');
const targets = [
  path.join(root, 'plugins', 'codex', 'tonder-web-sdk'),
  path.join(root, 'plugins', 'claude-code', 'tonder-web-sdk'),
];

for (const requiredPath of [sourceSkill, mcpDist, mcpDocs, mcpPackageJson]) {
  if (!existsSync(requiredPath)) {
    console.error(`Required source not found: ${requiredPath}`);
    if (requiredPath === mcpDist) console.error('Run: cd packages/tonder-mcp && npm run build');
    process.exit(1);
  }
}

for (const pluginRoot of targets) {
  const skillTarget = path.join(pluginRoot, 'skills', 'tonder-web-sdk-integrator');
  mkdirSync(path.dirname(skillTarget), { recursive: true });
  rmSync(skillTarget, { recursive: true, force: true });
  cpSync(sourceSkill, skillTarget, { recursive: true });

  const mcpTarget = path.join(pluginRoot, 'mcp');
  rmSync(mcpTarget, { recursive: true, force: true });
  mkdirSync(mcpTarget, { recursive: true });
  cpSync(mcpDist, path.join(mcpTarget, 'dist'), { recursive: true });
  cpSync(mcpDocs, path.join(mcpTarget, 'docs'), {
    recursive: true,
    filter: (source) => source !== maintainedRecipesSource,
  });
  cpSync(mcpPackageJson, path.join(mcpTarget, 'package.json'));

  console.log(`Synced ${path.relative(root, sourceSkill)} -> ${path.relative(root, skillTarget)}`);
  console.log(`Synced MCP package -> ${path.relative(root, mcpTarget)}`);
}

// Version stamping runs last so the packaged plugins carry the version the
// Claude catalog declares. Maintainers edit one number; this derives the rest.
try {
  for (const line of syncPluginVersions(root)) console.log(`Stamped ${line}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
