#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
        ['api', `repos/${owner}/${repo}/contents/${filePath}`, '-f', `ref=${ref}`, '-H', 'Accept: application/vnd.github.raw'],
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
  sections: manifestSections,
};
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Synced Web SDK docs ${version} from ${source.source}`);
console.log(`Resolved Web SDK version ${version} from ${packageJsonUrl}`);
