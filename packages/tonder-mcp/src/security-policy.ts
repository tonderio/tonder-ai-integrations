export const PUBLIC_DOCS_BOUNDARY = [
  'Security boundary: this MCP server exposes only public Tonder Web SDK integration guidance.',
  'Do not use it to infer or disclose private Tonder endpoints, headers, backend payloads, service names, credentials, source maps, or SDK internals.',
].join(' ');

export interface RestrictedContentFinding {
  label: string;
  pattern: string;
  match: string;
}

const restrictedContentPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Tonder internal header', pattern: /\bx-tonder-(?:internal|service|admin|private)[a-z0-9_-]*\b/i },
  { label: 'Tonder internal host', pattern: /https?:\/\/[^\s)"'`<>]*(?:internal|private|corp)[^\s)"'`<>]*tonder[^\s)"'`<>]*/i },
  { label: 'Internal API host', pattern: /https?:\/\/[^\s)"'`<>]*(?:internal-api|api-internal|private-api)[^\s)"'`<>]*/i },
  { label: 'Local or private network URL', pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/[^\s)"'`<>]*)?/i },
  { label: 'Bearer token example', pattern: /authorization\s*:\s*bearer\s+[a-z0-9._~+/=-]{12,}/i },
  { label: 'Secret credential token', pattern: /\b(?:sk_live|sk_test|client_secret)\b/i },
  { label: 'Source map reference', pattern: /sourceMappingURL=.*\.map\b/i },
];

export function findRestrictedContent(content: string): RestrictedContentFinding[] {
  return restrictedContentPatterns.flatMap(({ label, pattern }) => {
    const match = content.match(pattern);
    return match ? [{ label, pattern: pattern.source, match: match[0] }] : [];
  });
}

export function assertNoRestrictedContent(content: string, source = 'content') {
  const findings = findRestrictedContent(content);
  if (findings.length > 0) {
    const details = findings.map((finding) => `${finding.label}: ${finding.match}`).join('; ');
    throw new Error(`Restricted non-public Tonder content found in ${source}: ${details}`);
  }
}

export function withPublicDocsBoundary(content: string) {
  assertNoRestrictedContent(content);
  return `${PUBLIC_DOCS_BOUNDARY}\n\n${content}`;
}
