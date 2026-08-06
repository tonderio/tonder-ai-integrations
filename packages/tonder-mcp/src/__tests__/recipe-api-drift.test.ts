import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Recipe/SDK identifier drift check.
 *
 * Maintained recipes are hand-written and are not regenerated from the SDK, so
 * nothing else notices when the SDK renames or removes a public API name. This
 * test extracts every SDK identifier the recipes use and asserts each one still
 * exists in the synced README snapshot.
 *
 * WHAT IT CATCHES: renames and removals. If `enrollCard()` becomes
 * `saveCard()`, or `create('card_fields')` becomes `create('card')`, or an
 * `on_completed` event key disappears, this test fails.
 *
 * WHAT IT DOES NOT CATCH: semantic drift. A recipe that keeps using a name that
 * still exists but with an outdated PATTERN passes here. The canonical example
 * is `isApplePayAvailable()`, which returns
 * `{ available: true } | { available: false, code, message }`. A recipe that
 * treated it as a bare boolean would use the correct identifier and be silently
 * wrong. Behavioral changes still need a human reading the README diff.
 *
 * SOURCE OF TRUTH: the synced README snapshot, not a fetched `dist/index.d.ts`.
 * The maintainer guide already declares the public GitHub README the source of
 * truth for these docs, and the snapshot is committed, so the check stays
 * deterministic and offline. Fetching type declarations at test time would make
 * `npm test` network-dependent and flaky in CI for no extra coverage of the
 * names the recipes actually use.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, '../../docs/web-sdk');
const VERSION_DIR_PATTERN = /^\d+\.\d+\.\d+/;

function latestSnapshotDir() {
  const versions = readdirSync(docsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && VERSION_DIR_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  return path.join(docsRoot, versions[0]);
}

function maintainedRecipesDir() {
  const unversioned = path.join(docsRoot, 'recipes');
  return existsSync(unversioned) ? unversioned : path.join(latestSnapshotDir(), 'recipes');
}

function readRecipes() {
  const dir = maintainedRecipesDir();
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => ({ name, content: readFileSync(path.join(dir, name), 'utf8') }));
}

/**
 * Names that are browser or merchant-app APIs, not Tonder SDK surface. They
 * appear in recipe example code and must not be checked against the README.
 */
const NON_SDK_IDENTIFIERS = new Set([
  // MCP tool names exposed by this server, not Web SDK methods.
  'get_sdk_api_reference',
  'get_integration_recipe',
  'get_error_reference',
  'get_payment_status_reference',
  // Named in the recipes as an anti-pattern to avoid, not as SDK surface.
  'loadTonderScript',
  'alert',
  'querySelector',
  'getElementById',
  'replaceChildren',
  'addEventListener',
  'detectChanges',
  'set',
  'signal',
  'inject',
  'trim',
  'toUpperCase',
]);

interface Usage {
  identifier: string;
  recipe: string;
  kind: string;
}

function collect(pattern: RegExp, kind: string, recipe: string, content: string): Usage[] {
  return [...content.matchAll(pattern)]
    .map((match) => match[1])
    .filter((identifier) => !NON_SDK_IDENTIFIERS.has(identifier))
    .map((identifier) => ({ identifier, recipe, kind }));
}

function collectUsages(): Usage[] {
  return readRecipes().flatMap(({ name, content }) => [
    // tonder.pay(, this.tonder.init(, tonder.isApplePayAvailable(
    ...collect(/\btonder\.([A-Za-z_$][\w$]*)\s*\(/g, 'method', name, content),
    // tonderRef.current.pay(
    ...collect(/\btonder\w*(?:Ref)?\.current\.([A-Za-z_$][\w$]*)\s*\(/g, 'method', name, content),
    // Prose references such as `getTransaction()` or `unmount()`
    ...collect(/`(?:tonder\.)?([A-Za-z_$][\w$]*)\(\)`/g, 'method', name, content),
    // tonder.create('card_fields'), tonder.create('apple_pay_button')
    ...collect(/\.create\(\s*'([^']+)'/g, 'component', name, content),
    // on_completed:, on_error:, on_cancel:, on_open:
    ...collect(/\b(on_[a-z_]+)\s*:/g, 'event', name, content),
  ]);
}

describe('recipe SDK identifier drift', () => {
  const readme = readFileSync(path.join(latestSnapshotDir(), 'README.md'), 'utf8');
  const usages = collectUsages();

  it('extracts SDK identifiers from the maintained recipes', () => {
    expect(usages.length).toBeGreaterThan(0);
    expect(usages.map((usage) => usage.identifier)).toContain('pay');
  });

  it('only uses SDK identifiers that still exist in the synced README', () => {
    const missing = usages
      .filter((usage) => !readme.includes(usage.identifier))
      .map((usage) => `${usage.recipe}: ${usage.kind} "${usage.identifier}" is not in the synced Web SDK README`);

    expect([...new Set(missing)]).toEqual([]);
  });
});
