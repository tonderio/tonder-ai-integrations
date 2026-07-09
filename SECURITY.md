# Security Policy

This repository contains AI integration helpers for Tonder SDKs. It does not replace Tonder's official payment, compliance, or production-readiness guidance.

## Reporting a vulnerability

Please report suspected security issues privately to the Tonder team through your established Tonder support or security contact. Do not create public GitHub issues for vulnerabilities.

Include:

- affected plugin or package;
- version or commit SHA;
- reproduction steps;
- expected and actual behavior;
- security impact.

## Payment data handling

Integrations generated with this plugin must not collect raw card numbers, expiration dates, or CVV values in merchant-owned inputs. Card data must be collected only through Tonder SDK-rendered secure fields or the current Tonder-approved equivalent.

## Scope

Supported security scope for this repository:

- Claude Code and Codex plugin packaging;
- bundled local MCP documentation server;
- integration instructions and recipes;
- documentation snapshots shipped with the plugin.

Out of scope:

- the Tonder Web SDK implementation itself;
- merchant backend implementations;
- PCI compliance certification;
- production Tonder account configuration.

## AI plugin security boundary

This repository is public and installable by third-party AI coding tools. Treat every bundled skill, recipe, MCP response, generated documentation snapshot, and release artifact as public information.

The plugin must expose only merchant-facing, public SDK integration contracts. It must not include or encourage agents to reveal:

- private Tonder backend endpoints, service names, routing, or infrastructure details;
- internal headers, authentication schemes, backend request/response bodies, or non-public API contracts;
- secrets, tokens, credentials, customer data, logs, traces, source maps, or incident details;
- reverse-engineered SDK implementation details that are not documented as public integration behavior.

If a needed integration detail is missing from the public SDK docs, update the public SDK documentation first and then run the AI docs sync. Do not patch the AI plugin with private knowledge as a shortcut.

## Release hardening checklist

Before publishing a plugin release:

1. Sync docs only from the public Web SDK GitHub README/package metadata.
2. Run the MCP test suite, including the restricted-content scan.
3. Validate Claude and Codex plugin manifests.
4. Confirm generated artifacts do not contain secrets, private endpoints, internal headers, or undocumented backend contracts.
5. Keep release notes merchant-facing; do not mention internal systems or unreleased API behavior.
