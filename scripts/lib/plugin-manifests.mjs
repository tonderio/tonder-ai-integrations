/**
 * Plugin manifest discovery.
 *
 * SOURCE OF TRUTH: `.claude-plugin/marketplace.json` -> `plugins[].version`.
 * Every other version-bearing field in the repository is derived from it.
 *
 * Nothing here may index a single plugin. The Claude catalog lists plugins by
 * name, the Codex catalog is matched by that same name, and both are iterated.
 * Adding a second plugin requires editing catalogs, not this file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const CLAUDE_MARKETPLACE = path.join('.claude-plugin', 'marketplace.json');
export const CODEX_MARKETPLACE = path.join('.agents', 'plugins', 'marketplace.json');

/** Reads a JSON file and returns both the parsed value and its repo-relative path. */
export function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

/** Writes JSON in the repository's canonical shape: 2-space indent, trailing newline. */
export function writeJson(root, relativePath, value) {
  writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

/** `0.1.13+codex.20260806203903` -> `0.1.13`. A missing suffix returns the input. */
export function baseVersion(version) {
  return String(version).split('+')[0];
}

/** The immutable release tag a version is published under. */
export function releaseTag(pluginName, version) {
  return `${pluginName}--v${version}`;
}

/** Builds the `+codex.<timestamp>` cachebuster Codex uses to invalidate installs. */
export function codexVersion(version, now = new Date()) {
  const stamp = [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('');
  return `${baseVersion(version)}+codex.${stamp}`;
}

/**
 * Discovers every plugin declared in the Claude catalog and resolves the files
 * that must agree with its version.
 *
 * Returns one descriptor per plugin:
 *
 *   name              plugin name, the key both catalogs are matched on
 *   version           source of truth, from the Claude catalog
 *   claudePackage     repo-relative path to the Claude plugin package directory
 *   codexPackage      repo-relative path to the Codex plugin package directory, or null
 *   packageRoots      every package directory above, in catalog order
 *   claudeManifest    repo-relative path to the Claude plugin.json
 *   codexManifest     repo-relative path to the Codex plugin.json, or null
 *   expectedRef       `<name>--v<version>`, the tag Codex installs from
 *   actualRef         the ref currently written in the Codex catalog, or null
 *
 * Throws when a plugin declares no version or when a Codex catalog entry has no
 * matching Claude entry, because neither has a defensible source of truth.
 */
export function discoverPlugins(root) {
  const claudeCatalog = readJson(root, CLAUDE_MARKETPLACE);
  const codexCatalog = readJson(root, CODEX_MARKETPLACE);

  const codexByName = new Map((codexCatalog.plugins ?? []).map((entry) => [entry.name, entry]));
  const claudeNames = new Set((claudeCatalog.plugins ?? []).map((entry) => entry.name));

  for (const name of codexByName.keys()) {
    if (!claudeNames.has(name)) {
      throw new Error(
        `${CODEX_MARKETPLACE} lists "${name}" but ${CLAUDE_MARKETPLACE} does not. ` +
          'Every plugin needs a Claude catalog entry, which is the version source of truth.'
      );
    }
  }

  return (claudeCatalog.plugins ?? []).map((claudeEntry) => {
    const { name, version, source } = claudeEntry;
    if (!version) {
      throw new Error(`${CLAUDE_MARKETPLACE} entry "${name}" has no version.`);
    }

    const codexEntry = codexByName.get(name);
    const claudePackage = path.join(source);
    const codexPackage = codexEntry?.source?.path ? path.join(codexEntry.source.path) : null;

    return {
      name,
      version,
      claudePackage,
      codexPackage,
      packageRoots: [claudePackage, codexPackage].filter(Boolean),
      claudeManifest: path.join(claudePackage, '.claude-plugin', 'plugin.json'),
      codexManifest: codexPackage ? path.join(codexPackage, '.codex-plugin', 'plugin.json') : null,
      expectedRef: releaseTag(name, version),
      actualRef: codexEntry?.source?.ref ?? null,
    };
  });
}
