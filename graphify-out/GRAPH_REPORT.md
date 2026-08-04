# Graph Report - .  (2026-08-04)

## Corpus Check
- Large corpus: 546 files À ~374,289 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2631 nodes · 7459 edges · 1 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Whole Repository

## God Nodes (most connected - your core abstractions)
1. `cn()` - 230 edges
2. `toErrorResponse()` - 102 edges
3. `createClient()` - 88 edges
4. `requireRole()` - 83 edges
5. `useAuth()` - 75 edges
6. `Button()` - 65 edges
7. `createClient()` - 59 edges
8. `checkRateLimit()` - 50 edges
9. `supabaseAdmin()` - 47 edges
10. `rateLimitResponse()` - 45 edges

## Surprising Connections (you probably didn't know these)
- `Three-Layer Safety Model` --semantically_similar_to--> `Read-Only by Default Safety Model`  [INFERRED] [semantically similar]
  mcp-server/README.md → docs/mcp.md
- `PWA Web App Manifest` --references--> `CodixIA PWA App Icon (192x192)`  [EXTRACTED]
  src/app/manifest.ts → public/icon-192.png
- `Push Settings Server Actions` --references--> `CodixIA PWA App Icon (192x192)`  [EXTRACTED]
  src/app/(dashboard)/settings/push-actions.ts → public/icon-192.png
- `Root App Layout` --references--> `CodixIA PWA App Icon (192x192)`  [EXTRACTED]
  src/app/layout.tsx → public/icon-192.png
- `Web Push Sender` --references--> `CodixIA PWA App Icon (192x192)`  [EXTRACTED]
  src/lib/push/send-push.ts → public/icon-192.png

## Import Cycles
- 3-file cycle: `src/lib/whatsapp/interactive.ts -> src/lib/whatsapp/meta-api.ts -> src/types/index.ts -> src/lib/whatsapp/interactive.ts`
- 4-file cycle: `src/lib/whatsapp/interactive.ts -> src/lib/whatsapp/meta-api.ts -> src/lib/whatsapp/template-components.ts -> src/types/index.ts -> src/lib/whatsapp/interactive.ts`
- 4-file cycle: `src/lib/whatsapp/interactive.ts -> src/lib/whatsapp/meta-api.ts -> src/lib/whatsapp/template-send-builder.ts -> src/types/index.ts -> src/lib/whatsapp/interactive.ts`
- 5-file cycle: `src/lib/whatsapp/interactive.ts -> src/lib/whatsapp/meta-api.ts -> src/lib/whatsapp/template-components.ts -> src/lib/whatsapp/template-validators.ts -> src/types/index.ts -> src/lib/whatsapp/interactive.ts`
- 5-file cycle: `src/lib/whatsapp/interactive.ts -> src/lib/whatsapp/meta-api.ts -> src/lib/whatsapp/template-send-builder.ts -> src/lib/whatsapp/template-validators.ts -> src/types/index.ts -> src/lib/whatsapp/interactive.ts`

## Hyperedges (group relationships)
- **Private Security Disclosure Flow** — github_security_vulnerability_reporting, github_issue_template_bug_report_security_redirect, github_issue_template_config_security_advisory_link, github_pull_request_template_security_notice, contributing_security_reporting_note [INFERRED 0.85]
- **MCP Server Wraps Public API** — docs_mcp_mcp_server, mcp_server_readme_mcp_server_readme, docs_public_api_public_api_doc, mcp_server_readme_safety_model [INFERRED 0.95]
- **Pre-Merge Quality Gate** — github_workflows_ci_check_job, agents_commands, github_pull_request_template_test_plan [INFERRED 0.75]

## Communities (1 total, 0 thin omitted)

### Community 0 - "Whole Repository"
Cohesion: 0.00
Nodes (1997): $schema, style, rsc, tsx, tailwind, config, css, baseColor (+1989 more)

## Knowledge Gaps
- **650 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+645 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _650 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Whole Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.002155926775373472 - nodes in this community are weakly interconnected._