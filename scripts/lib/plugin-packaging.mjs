/**
 * Plugin packaging resolution.
 *
 * Answers one question: for each plugin, which source skills does it bundle?
 *
 * The catalogs cannot answer it. `.claude-plugin/marketplace.json` carries no
 * skills field, and the Codex manifest's `"skills": "./skills/"` is a directory
 * pointer, not a list. Both files are validated by Claude and Codex, so this
 * repository does not invent fields inside them; the mapping lives in
 * `plugin-packaging.json`, which describes how packages are assembled and is
 * this repository's concern alone.
 *
 * Plugin identity still comes from `discoverPlugins`, the same name-keyed
 * catalog discovery the version tooling uses. This file adds the skill mapping
 * to it; it never maintains its own list of plugins.
 *
 * Every failure here is loud. A plugin packaged with no skill still installs
 * and still starts, it just silently does nothing an agent can use.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { discoverPlugins, readJson } from './plugin-manifests.mjs';

export const PACKAGING_CONFIG = 'plugin-packaging.json';
export const SKILLS_SOURCE_DIR = 'skills';

/**
 * Resolves every plugin's packaging inputs.
 *
 * Returns one descriptor per plugin in the Claude catalog, extending the
 * `discoverPlugins` descriptor with:
 *
 *   skills   [{ name, sourcePath }] — declared skills, resolved to existing dirs
 *
 * Throws when:
 *   - a catalog plugin has no `plugin-packaging.json` entry
 *   - an entry declares an empty or non-array `skills`
 *   - a declared skill has no directory under `skills/`
 *   - the config declares a plugin the Claude catalog does not list
 *
 * @param {string} root absolute repository root
 */
export function resolvePluginPackaging(root) {
  const plugins = discoverPlugins(root);
  const declared = readJson(root, PACKAGING_CONFIG).plugins ?? {};

  const catalogNames = new Set(plugins.map((plugin) => plugin.name));
  for (const name of Object.keys(declared)) {
    if (!catalogNames.has(name)) {
      throw new Error(
        `${PACKAGING_CONFIG} declares plugin "${name}", which is not listed in the Claude catalog. ` +
          'Add it to .claude-plugin/marketplace.json or remove the packaging entry.'
      );
    }
  }

  return plugins.map((plugin) => ({
    ...plugin,
    skills: resolveSkills(root, plugin.name, declared[plugin.name]),
  }));
}

function resolveSkills(root, pluginName, entry) {
  if (!entry) {
    throw new Error(
      `${PACKAGING_CONFIG} has no entry for plugin "${pluginName}". ` +
        `Add: "${pluginName}": { "skills": ["<skill-directory-name>"] }`
    );
  }

  const names = entry.skills;
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error(
      `${PACKAGING_CONFIG} entry "${pluginName}" declares no skills. ` +
        'A plugin packaged without a skill installs and does nothing.'
    );
  }

  return names.map((name) => {
    const sourcePath = path.join(SKILLS_SOURCE_DIR, name);
    if (!existsSync(path.join(root, sourcePath))) {
      throw new Error(
        `Plugin "${pluginName}" declares skill "${name}" in ${PACKAGING_CONFIG}, ` +
          `but ${sourcePath}/ does not exist.`
      );
    }
    return { name, sourcePath };
  });
}
