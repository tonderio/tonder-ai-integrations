#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const packageJsonUrl = normalizeSourceUrl(
  process.env.TONDER_WEB_SDK_PACKAGE_JSON_URL || 'https://github.com/tonderio/web-sdk/blob/main/package.json',
);
const sourceUrl = normalizeSourceUrl(
  process.env.TONDER_WEB_SDK_README_URL || 'https://github.com/tonderio/web-sdk/blob/main/README.md',
);
const sdkPackage = await readPackageJson();
const version = process.env.TONDER_WEB_SDK_VERSION || sdkPackage.version;
if (!version) {
  throw new Error(`Unable to resolve Web SDK version from ${packageJsonUrl}. Set TONDER_WEB_SDK_VERSION explicitly.`);
}
const outDir = path.join(root, 'docs', 'web-sdk', version);
const sectionsDir = path.join(outDir, 'sections');

function normalizeSourceUrl(url) {
  const githubBlob = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (githubBlob) {
    const [, owner, repo, branch, filePath] = githubBlob;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }

  return url;
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'User-Agent': 'tonder-ai-integrations-docs-sync/0.1',
    },
  });
  if (response.ok) return response.text();

  const githubRaw = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (githubRaw && (response.status === 403 || response.status === 429)) {
    const [, owner, repo, ref, filePath] = githubRaw;
    try {
      return execFileSync(
        'gh',
        ['api', `repos/${owner}/${repo}/contents/${filePath}?ref=${ref}`, '-H', 'Accept: application/vnd.github.raw'],
        { encoding: 'utf8' },
      );
    } catch (error) {
      throw new Error(`Unable to fetch ${url}: HTTP ${response.status}; gh api fallback failed: ${error.message}`);
    }
  }

  throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
}

async function readPackageJson() {
  const content = await fetchText(packageJsonUrl, 'application/json,text/plain;q=0.9,*/*;q=0.8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Unable to parse Web SDK package.json from ${packageJsonUrl}: ${error.message}`);
  }
}

async function readSource() {
  const content = await fetchText(sourceUrl, 'text/markdown,text/plain;q=0.9,*/*;q=0.8');
  return { content, source: sourceUrl };
}

function slugify(title) {
  return title.toLowerCase().replace(/[`'"()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function splitSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: 'README', slug: 'readme', lines: [] };
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (current.lines.length) sections.push(current);
      const title = match[1].trim();
      current = { title, slug: slugify(title), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) sections.push(current);
  return sections;
}


function compareSemverDesc(a, b) {
  const left = a.split('.').map((part) => Number.parseInt(part, 10));
  const right = b.split('.').map((part) => Number.parseInt(part, 10));
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (right[index] || 0) - (left[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const VERSION_DIR_PATTERN = /^\d+\.\d+\.\d+/;

function listSnapshotVersions() {
  const sdkDocsRoot = path.join(root, 'docs', 'web-sdk');
  if (!existsSync(sdkDocsRoot)) return [];

  return readdirSync(sdkDocsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && VERSION_DIR_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort(compareSemverDesc);
}

/**
 * Maintained recipes are hand-written and version independent. They live in a
 * single unversioned directory and are copied INTO each generated snapshot, so
 * a snapshot never has to inherit them from the previous version.
 */
function prunePreviousSnapshots(keepCount) {
  const stale = listSnapshotVersions().slice(keepCount);
  for (const staleVersion of stale) {
    rmSync(path.join(root, 'docs', 'web-sdk', staleVersion), { recursive: true, force: true });
    console.log(`Pruned stale Web SDK docs snapshot ${staleVersion}`);
  }
  return stale;
}

const source = await readSource();
rmSync(sectionsDir, { recursive: true, force: true });
mkdirSync(sectionsDir, { recursive: true });
writeFileSync(path.join(outDir, 'README.md'), source.content);
const sections = splitSections(source.content);
const manifestSections = {};
for (const section of sections) {
  const filename = `${section.slug}.md`;
  writeFileSync(path.join(sectionsDir, filename), section.lines.join('\n').trim() + '\n');
  manifestSections[section.slug] = { title: section.title, path: `sections/${filename}` };
}
const recipesSourceDir = path.join(root, 'docs', 'web-sdk', 'recipes');
let recipesFrom = null;
if (existsSync(recipesSourceDir)) {
  const recipesTargetDir = path.join(outDir, 'recipes');
  rmSync(recipesTargetDir, { recursive: true, force: true });
  cpSync(recipesSourceDir, recipesTargetDir, { recursive: true });
  recipesFrom = path.relative(root, recipesSourceDir);
  console.log(`Copied maintained recipes from ${recipesFrom}`);
}

const manifest = {
  sdk: 'web-sdk',
  version,
  package_name: sdkPackage.name || null,
  package_json_url: packageJsonUrl,
  source: source.source,
  source_url: sourceUrl,
  sha256: createHash('sha256').update(source.content).digest('hex'),
  generated_at: new Date().toISOString(),
  readme: 'README.md',
  recipes_from: recipesFrom,
  sections: manifestSections,
};
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Synced Web SDK docs ${version} from ${source.source}`);
console.log(`Resolved Web SDK version ${version} from ${packageJsonUrl}`);

// Pruning runs last, after the snapshot above is complete, so an interrupted
// sync can never leave the package without a usable docs snapshot.
const keepCount = Math.max(1, Number.parseInt(process.env.TONDER_DOCS_KEEP_VERSIONS || '1', 10) || 1);
const pruned = prunePreviousSnapshots(keepCount);
console.log(`Kept ${keepCount} Web SDK docs snapshot(s); pruned ${pruned.length}`);
