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
