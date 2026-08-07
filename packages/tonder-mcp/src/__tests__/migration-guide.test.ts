import { describe, expect, it } from 'vitest';
import { getMigrationGuide } from '../docs-registry.js';

describe('getMigrationGuide', () => {
  it('serves both guides whole, with their source url', () => {
    for (const from of ['direct_api', 'legacy_sdk'] as const) {
      const g = getMigrationGuide({ from });
      expect(g.from).toBe(from);
      expect(g.title).toMatch(/Migrating/);
      expect(g.source_url).toContain('githubusercontent.com');
      expect(g.content.length).toBeGreaterThan(2000);
      console.log(`  ${from.padEnd(12)} ${g.content.split('\n').length} líneas`);
    }
  });

  it('names the available keys when asked for one that does not exist', () => {
    expect(() => getMigrationGuide({ from: 'nope' as never })).toThrow(
      /Available: direct_api, legacy_sdk/,
    );
  });
});
