import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Plugin version drift check.
 *
 * A plugin's version appears in four derived places. `scripts/sync-plugin-versions.mjs`
 * stamps all of them from one source of truth, but nothing forces a maintainer
 * to run it. This test is what makes the single source of truth real: it fails
 * when a derived copy was edited by hand, or when the sync was skipped.
 *
 * SOURCE OF TRUTH: `.claude-plugin/marketplace.json` -> `plugins[].version`.
 *
 * WHAT IT GUARDS, per plugin listed in the Claude catalog:
 *   - the Claude plugin manifest `version`
 *   - the Codex plugin manifest `version`, compared on its base (pre-`+`) part
 *   - the Codex marketplace `source.ref`, as `<plugin-name>--v<version>`
 *   - that both catalogs list the same set of plugins
 *
 * WHAT IT DOES NOT GUARD: whether the version is the *right* version.
 * `CHANGELOG.md` and `docs/releases/<version>.md` are narrative and stay human-
 * maintained. This test only proves the machine-readable copies agree.
 *
 * The Codex version carries a `+codex.<timestamp>` cachebuster, so only the base
 * version is compared. The suffix is ignored; the base is not. A Codex manifest
 * pinned to `0.1.12+codex.<anything>` while the catalog says `0.1.13` fails.
 *
 * NOTHING HERE ASSUMES ONE PLUGIN. Every assertion iterates the catalog.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

const CLAUDE_MARKETPLACE = path.join('.claude-plugin', 'marketplace.json');
const CODEX_MARKETPLACE = path.join('.agents', 'plugins', 'marketplace.json');

interface ClaudeCatalogEntry {
  name: string;
  version: string;
  source: string;
}

interface CodexCatalogEntry {
  name: string;
  source?: { path?: string; ref?: string };
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;
}

/** `0.1.13+codex.20260806203903` -> `0.1.13`. */
function baseVersion(version: string): string {
  return String(version).split('+')[0];
}

const claudeCatalog = readJson<{ version: string; plugins: ClaudeCatalogEntry[] }>(CLAUDE_MARKETPLACE);
const codexCatalog = readJson<{ plugins: CodexCatalogEntry[] }>(CODEX_MARKETPLACE);
const codexByName = new Map(codexCatalog.plugins.map((entry) => [entry.name, entry]));

describe('plugin version single source of truth', () => {
  it('declares at least one plugin with a version', () => {
    expect(claudeCatalog.plugins.length).toBeGreaterThan(0);
    for (const plugin of claudeCatalog.plugins) {
      expect(plugin.version, `${CLAUDE_MARKETPLACE}: plugin "${plugin.name}" has no version`).toBeTruthy();
    }
  });

  it('lists the same plugins in the Claude and Codex catalogs', () => {
    const claudeNames = claudeCatalog.plugins.map((plugin) => plugin.name).sort();
    const codexNames = [...codexByName.keys()].sort();

    expect(codexNames, `${CODEX_MARKETPLACE} does not list the same plugins as ${CLAUDE_MARKETPLACE}`).toEqual(
      claudeNames
    );
  });

  it('keeps every derived version equal to the Claude catalog version', () => {
    const mismatches: string[] = [];

    for (const plugin of claudeCatalog.plugins) {
      const expected = plugin.version;

      const claudeManifestPath = path.join(plugin.source, '.claude-plugin', 'plugin.json');
      const claudeManifest = readJson<{ version: string }>(claudeManifestPath);
      if (claudeManifest.version !== expected) {
        mismatches.push(
          `${claudeManifestPath}: version is "${claudeManifest.version}", expected "${expected}" ` +
            `from ${CLAUDE_MARKETPLACE} plugins[${plugin.name}].version`
        );
      }

      const codexEntry = codexByName.get(plugin.name);
      const codexPackage = codexEntry?.source?.path;
      if (codexPackage) {
        const codexManifestPath = path.join(codexPackage, '.codex-plugin', 'plugin.json');
        const codexManifest = readJson<{ version: string }>(codexManifestPath);
        const codexBase = baseVersion(codexManifest.version);
        if (codexBase !== expected) {
          mismatches.push(
            `${codexManifestPath}: base version is "${codexBase}" (from "${codexManifest.version}"), ` +
              `expected "${expected}" from ${CLAUDE_MARKETPLACE} plugins[${plugin.name}].version`
          );
        }
      }

      const expectedRef = `${plugin.name}--v${expected}`;
      const actualRef = codexEntry?.source?.ref;
      if (actualRef !== expectedRef) {
        mismatches.push(
          `${CODEX_MARKETPLACE}: plugins[${plugin.name}].source.ref is "${actualRef}", expected "${expectedRef}"`
        );
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('regenerates the Codex cachebuster suffix on the current base version', () => {
    for (const plugin of claudeCatalog.plugins) {
      const codexPackage = codexByName.get(plugin.name)?.source?.path;
      if (!codexPackage) continue;

      const codexManifestPath = path.join(codexPackage, '.codex-plugin', 'plugin.json');
      const { version } = readJson<{ version: string }>(codexManifestPath);
      const [, suffix] = version.split('+');

      if (suffix !== undefined) {
        expect(suffix, `${codexManifestPath}: suffix "${suffix}" is not a +codex.<timestamp> cachebuster`).toMatch(
          /^codex\.\d{14}$/
        );
      }
    }
  });
});
