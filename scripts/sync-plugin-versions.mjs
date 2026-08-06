#!/usr/bin/env node
/**
 * Stamps every derived plugin version from the source of truth.
 *
 * Source of truth: `.claude-plugin/marketplace.json` -> `plugins[].version`.
 *
 * Derived, per plugin:
 *   1. Claude plugin manifest `version`
 *   2. Codex plugin manifest `version`, with a fresh `+codex.<timestamp>` suffix
 *   3. Codex marketplace `source.ref`, as `<plugin-name>--v<version>`
 *
 * NOT derived: the Claude catalog's own top-level `version`. That field
 * describes the catalog, not any plugin in it, and maintainers bump it by hand
 * when the catalog's shape changes. See docs/maintainers/README.md.
 *
 * Run directly, or let `scripts/sync-plugin-packages.mjs` call it.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODEX_MARKETPLACE,
  codexVersion,
  discoverPlugins,
  readJson,
  writeJson,
} from './lib/plugin-manifests.mjs';

/**
 * Applies the source-of-truth version to every derived location.
 *
 * @returns {string[]} human-readable lines describing what was stamped
 */
export function syncPluginVersions(root, { now = new Date() } = {}) {
  const plugins = discoverPlugins(root);
  const log = [];

  const codexCatalog = readJson(root, CODEX_MARKETPLACE);
  const codexByName = new Map((codexCatalog.plugins ?? []).map((entry) => [entry.name, entry]));
  let codexCatalogChanged = false;

  for (const plugin of plugins) {
    const claudeManifest = readJson(root, plugin.claudeManifest);
    claudeManifest.version = plugin.version;
    writeJson(root, plugin.claudeManifest, claudeManifest);
    log.push(`${plugin.name}: ${plugin.claudeManifest} -> ${plugin.version}`);

    if (plugin.codexManifest) {
      const codexManifest = readJson(root, plugin.codexManifest);
      // The suffix is a cachebuster, so it is regenerated on every sync. Only
      // the base version is meaningful, and it always tracks the source of truth.
      codexManifest.version = codexVersion(plugin.version, now);
      writeJson(root, plugin.codexManifest, codexManifest);
      log.push(`${plugin.name}: ${plugin.codexManifest} -> ${codexManifest.version}`);
    }

    const codexEntry = codexByName.get(plugin.name);
    if (codexEntry?.source && codexEntry.source.ref !== plugin.expectedRef) {
      codexEntry.source.ref = plugin.expectedRef;
      codexCatalogChanged = true;
    }
    if (codexEntry?.source) {
      log.push(`${plugin.name}: ${CODEX_MARKETPLACE} source.ref -> ${plugin.expectedRef}`);
    }
  }

  if (codexCatalogChanged) writeJson(root, CODEX_MARKETPLACE, codexCatalog);

  return log;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    for (const line of syncPluginVersions(root)) console.log(line);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
