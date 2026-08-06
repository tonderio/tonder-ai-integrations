import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Plugin packaging drift check.
 *
 * `scripts/sync-web-sdk-skill.mjs` assembles every plugin package from source.
 * Nothing forces a maintainer to run it, and nothing stops a package from being
 * committed half-built. A plugin missing its skill directory still installs and
 * still starts its MCP server — it just does nothing an agent can use. That
 * failure is invisible until a user hits it.
 *
 * WHAT IT GUARDS, for every plugin in `.claude-plugin/marketplace.json` and
 * every package directory that plugin ships (Claude and Codex):
 *   - each skill declared in `plugin-packaging.json` is present in the package
 *   - each packaged skill is byte-identical to its source under `skills/`
 *   - the package ships no skill that was not declared
 *   - the MCP payload is present: `mcp/dist/server.js`, `mcp/package.json`, `mcp/docs/`
 *   - the MCP payload is byte-identical to `packages/tonder-mcp/`
 *
 * WHAT IT DOES NOT GUARD: whether the source skill or the built MCP bundle is
 * *correct*. This only proves the packaged copy matches what it was built from.
 *
 * IT RE-READS THE FILESYSTEM ON PURPOSE. It does not import
 * `scripts/lib/plugin-packaging.mjs`. A guard that shares code with the thing
 * it guards inherits that code's bugs and would pass on a wrong-but-consistent
 * result. The plugin version drift check is written the same way, for the same
 * reason. The one rule restated here rather than imported is the recipe
 * exclusion, called out below.
 *
 * NOTHING HERE ASSUMES ONE PLUGIN. Every assertion iterates the catalog.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const mcpPackageRoot = path.join(repoRoot, 'packages', 'tonder-mcp');

const CLAUDE_MARKETPLACE = path.join('.claude-plugin', 'marketplace.json');
const CODEX_MARKETPLACE = path.join('.agents', 'plugins', 'marketplace.json');
const PACKAGING_CONFIG = 'plugin-packaging.json';
const SKILLS_SOURCE_DIR = 'skills';

/**
 * Maintained recipes live in one unversioned directory and the docs sync already
 * copies them into the versioned snapshot, so the packaging step excludes them
 * to avoid shipping them twice. Restated here rather than imported — see above.
 */
const EXCLUDED_FROM_PACKAGED_DOCS = 'web-sdk/recipes';

interface ClaudeCatalogEntry {
  name: string;
  source: string;
}

interface CodexCatalogEntry {
  name: string;
  source?: { path?: string };
}

interface PackagingEntry {
  skills?: string[];
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;
}

/** Sorted POSIX-style relative paths of every file under `dir`, recursively. */
function listFiles(dir: string, prefix = ''): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listFiles(path.join(dir, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

function hashFile(absolutePath: string): string {
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
}

function isDirectory(absolutePath: string): boolean {
  return existsSync(absolutePath) && statSync(absolutePath).isDirectory();
}

/**
 * Compares two directory trees file by file.
 *
 * @param keep optional filter applied to the source listing, for content the
 *             packaging step deliberately does not ship
 * @returns human-readable problems, each naming the plugin and the file
 */
function compareTrees(
  label: string,
  sourceDir: string,
  packagedDir: string,
  keep: (relativePath: string) => boolean = () => true
): string[] {
  if (!isDirectory(packagedDir)) {
    return [`${label}: ${path.relative(repoRoot, packagedDir)} is missing`];
  }

  const problems: string[] = [];
  const expected = listFiles(sourceDir).filter(keep);
  const packaged = new Set(listFiles(packagedDir));

  for (const relative of expected) {
    if (!packaged.has(relative)) {
      problems.push(`${label}: ${path.relative(repoRoot, packagedDir)}/${relative} was not copied`);
      continue;
    }
    packaged.delete(relative);
    if (hashFile(path.join(sourceDir, relative)) !== hashFile(path.join(packagedDir, relative))) {
      problems.push(
        `${label}: ${path.relative(repoRoot, packagedDir)}/${relative} does not match ` +
          `${path.relative(repoRoot, sourceDir)}/${relative}`
      );
    }
  }

  for (const relative of packaged) {
    problems.push(
      `${label}: ${path.relative(repoRoot, packagedDir)}/${relative} is not in ` +
        `${path.relative(repoRoot, sourceDir)}`
    );
  }

  return problems;
}

const claudeCatalog = readJson<{ plugins: ClaudeCatalogEntry[] }>(CLAUDE_MARKETPLACE);
const codexCatalog = readJson<{ plugins: CodexCatalogEntry[] }>(CODEX_MARKETPLACE);
const packaging = readJson<{ plugins: Record<string, PackagingEntry> }>(PACKAGING_CONFIG);

const codexByName = new Map(codexCatalog.plugins.map((entry) => [entry.name, entry]));

/** Every plugin with the package directories it ships, discovered by name. */
const plugins = claudeCatalog.plugins.map((entry) => {
  const codexPackage = codexByName.get(entry.name)?.source?.path;
  return {
    name: entry.name,
    declaredSkills: packaging.plugins?.[entry.name]?.skills,
    packageRoots: [entry.source, codexPackage].filter((value): value is string => Boolean(value)).map((p) => path.join(p)),
  };
});

describe('plugin packaging', () => {
  it('declares packaging for every plugin in the catalog', () => {
    expect(plugins.length).toBeGreaterThan(0);

    const problems: string[] = [];
    for (const plugin of plugins) {
      if (!Array.isArray(plugin.declaredSkills) || plugin.declaredSkills.length === 0) {
        problems.push(
          `${PACKAGING_CONFIG}: plugin "${plugin.name}" declares no skills. ` +
            `Add: "${plugin.name}": { "skills": ["<skill-directory-name>"] }`
        );
      }
      if (plugin.packageRoots.length === 0) {
        problems.push(`plugin "${plugin.name}" has no package directory in either catalog`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('declares only skills that exist under skills/', () => {
    const problems: string[] = [];

    for (const plugin of plugins) {
      for (const skill of plugin.declaredSkills ?? []) {
        const sourcePath = path.join(SKILLS_SOURCE_DIR, skill);
        if (!isDirectory(path.join(repoRoot, sourcePath))) {
          problems.push(
            `plugin "${plugin.name}" declares skill "${skill}" in ${PACKAGING_CONFIG}, ` +
              `but ${sourcePath}/ does not exist`
          );
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it('packages every declared skill, and only those, byte-for-byte', () => {
    const problems: string[] = [];

    for (const plugin of plugins) {
      const declared = plugin.declaredSkills ?? [];

      for (const packageRoot of plugin.packageRoots) {
        const skillsDir = path.join(repoRoot, packageRoot, SKILLS_SOURCE_DIR);
        if (!isDirectory(skillsDir)) {
          problems.push(`plugin "${plugin.name}": ${packageRoot}/skills/ is missing`);
          continue;
        }

        for (const skill of declared) {
          const sourceDir = path.join(repoRoot, SKILLS_SOURCE_DIR, skill);
          if (!isDirectory(sourceDir)) continue; // reported by the previous test

          const packagedDir = path.join(skillsDir, skill);
          if (!isDirectory(packagedDir)) {
            problems.push(
              `plugin "${plugin.name}": skill "${skill}" is missing from ${packageRoot}/skills/. ` +
                'Run: node scripts/sync-web-sdk-skill.mjs'
            );
            continue;
          }

          problems.push(...compareTrees(`plugin "${plugin.name}", skill "${skill}"`, sourceDir, packagedDir));
        }

        for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
          if (entry.isDirectory() && !declared.includes(entry.name)) {
            problems.push(
              `plugin "${plugin.name}": ${packageRoot}/skills/${entry.name}/ is not declared in ${PACKAGING_CONFIG}`
            );
          }
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it('packages the MCP runtime payload into every plugin package', () => {
    const problems: string[] = [];

    for (const plugin of plugins) {
      for (const packageRoot of plugin.packageRoots) {
        const label = `plugin "${plugin.name}"`;
        const mcpDir = path.join(repoRoot, packageRoot, 'mcp');

        if (!isDirectory(mcpDir)) {
          problems.push(`${label}: ${packageRoot}/mcp/ is missing. Run: node scripts/sync-web-sdk-skill.mjs`);
          continue;
        }

        const packageJson = path.join(mcpDir, 'package.json');
        if (!existsSync(packageJson)) {
          problems.push(`${label}: ${packageRoot}/mcp/package.json is missing`);
        } else if (hashFile(packageJson) !== hashFile(path.join(mcpPackageRoot, 'package.json'))) {
          problems.push(`${label}: ${packageRoot}/mcp/package.json does not match packages/tonder-mcp/package.json`);
        }

        if (!existsSync(path.join(mcpDir, 'dist', 'server.js'))) {
          problems.push(
            `${label}: ${packageRoot}/mcp/dist/server.js is missing. ` +
              'The bundled MCP runtime must be committed inside each plugin package.'
          );
        } else {
          problems.push(...compareTrees(label, path.join(mcpPackageRoot, 'dist'), path.join(mcpDir, 'dist')));
        }

        problems.push(
          ...compareTrees(
            label,
            path.join(mcpPackageRoot, 'docs'),
            path.join(mcpDir, 'docs'),
            (relative) => !relative.startsWith(`${EXCLUDED_FROM_PACKAGED_DOCS}/`)
          )
        );
      }
    }

    expect(problems).toEqual([]);
  });
});
