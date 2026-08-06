#!/usr/bin/env node
/**
 * Assembles every installable plugin package, then stamps derived versions.
 *
 * Nothing here names a plugin, a skill, or a package directory. Plugins come
 * from the name-keyed catalog discovery in `lib/plugin-manifests.mjs`; the
 * skills each one bundles come from `plugin-packaging.json`. Adding a second
 * plugin is a data change in the catalogs and that config, never an edit here.
 *
 * Per plugin, per package directory (Claude and Codex):
 *   1. `skills/` is rebuilt from every declared source skill
 *   2. `mcp/` is rebuilt from the built `tonder-docs` runtime
 *
 * Both directories are wiped before the copy, so a renamed or removed skill
 * cannot survive as a stale copy inside a shipped package.
 *
 * Version stamping runs last. See `sync-plugin-versions.mjs`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePluginPackaging } from './lib/plugin-packaging.mjs';
import { syncPluginVersions } from './sync-plugin-versions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const mcpPackageRoot = path.join(root, 'packages', 'tonder-mcp');
const mcpDist = path.join(mcpPackageRoot, 'dist');
const mcpDocs = path.join(mcpPackageRoot, 'docs');
const mcpPackageJson = path.join(mcpPackageRoot, 'package.json');
// Maintained-recipe source directory. The docs sync already copied it into the
// generated snapshot, so shipping it again would duplicate it in every plugin.
const maintainedRecipesSource = path.join(mcpDocs, 'web-sdk', 'recipes');

for (const requiredPath of [mcpDist, mcpDocs, mcpPackageJson]) {
  if (!existsSync(requiredPath)) {
    console.error(`Required source not found: ${requiredPath}`);
    if (requiredPath === mcpDist) console.error('Run: cd packages/tonder-mcp && npm run build');
    process.exit(1);
  }
}

let plugins;
try {
  plugins = resolvePluginPackaging(root);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

for (const plugin of plugins) {
  for (const packageRoot of plugin.packageRoots) {
    const skillsTarget = path.join(root, packageRoot, 'skills');
    rmSync(skillsTarget, { recursive: true, force: true });
    mkdirSync(skillsTarget, { recursive: true });

    for (const skill of plugin.skills) {
      cpSync(path.join(root, skill.sourcePath), path.join(skillsTarget, skill.name), { recursive: true });
      console.log(`${plugin.name}: ${skill.sourcePath} -> ${path.join(packageRoot, 'skills', skill.name)}`);
    }

    const mcpTarget = path.join(root, packageRoot, 'mcp');
    rmSync(mcpTarget, { recursive: true, force: true });
    mkdirSync(mcpTarget, { recursive: true });
    cpSync(mcpDist, path.join(mcpTarget, 'dist'), { recursive: true });
    cpSync(mcpDocs, path.join(mcpTarget, 'docs'), {
      recursive: true,
      filter: (source) => source !== maintainedRecipesSource,
    });
    cpSync(mcpPackageJson, path.join(mcpTarget, 'package.json'));
    console.log(`${plugin.name}: MCP package -> ${path.join(packageRoot, 'mcp')}`);
  }
}

// Version stamping runs last so the packaged plugins carry the version the
// Claude catalog declares. Maintainers edit one number; this derives the rest.
try {
  for (const line of syncPluginVersions(root)) console.log(`Stamped ${line}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
