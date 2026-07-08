# Web SDK References

The editable source references live in:

```text
skills/tonder-web-sdk-integrator/references/
```

Plugin packages contain generated copies of that skill so Codex and Claude Code can install them independently.

After editing the source skill or references, run:

```bash
node scripts/sync-web-sdk-skill.mjs
```

The sync script uses Node.js filesystem APIs so it works on macOS, Linux, and Windows.
