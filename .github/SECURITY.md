# Security policy

## Supported versions

This is a hackathon submission for the Team USA × Google Cloud Hackathon Challenge 2 (May 2026). The deployed Cloud Run revisions linked from `README.md` are the only supported deployment.

## Reporting a vulnerability

If you find a security vulnerability in Hometown Pathway Atlas — please **do not open a public GitHub issue**. Instead, email the maintainer:

- **Stephen Sookra** — `stephensookra@gmail.com`

Reasonable response window: within 72 hours.

When reporting, include:

1. The component (frontend / backend / data pipeline / Cloud Run config)
2. A minimal reproduction (URL, request payload, or repo path)
3. Impact summary — what an attacker could do
4. Suggested remediation (if you have one)

## Out of scope

- The atlas data itself (US Census ACS, Move United chapters, public Olympic/Paralympic rosters) is publicly sourced.
- Demo behavior of the ComplianceLog panel — see `CLAUDE.md` for the live-vs-scripted distinction.
- Hackathon-scope items deferred for future hardening (extensive rate limiting, full WAF, multi-region failover).
