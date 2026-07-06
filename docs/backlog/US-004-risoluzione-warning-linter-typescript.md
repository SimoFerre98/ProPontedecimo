# US-004: Risoluzione warning linter e TypeScript

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** MEDIUM | **Story Points:** 1 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio una codebase senza warning di compilazione né del linter,
così che ogni nuovo warning sia immediatamente visibile e la qualità resti conforme alle Developer Guidelines.

**Demonstrates**
After implementing this story, the user can: eseguire build e lint del progetto ottenendo zero warning.

**Acceptance Criteria**
- [x] La build TypeScript in strict mode non produce alcun warning
- [x] Il linter non segnala alcun warning, incluse le chiavi di array basate su index
- [x] Nessuna soppressione generica dei warning (es. `eslint-disable` di massa) introdotta come scorciatoia

**Status:** DONE
**Plan:** [docs/planning/US-004-plan.md](../planning/US-004-plan.md)

**Merge:** merge --no-ff su `dev` (2026-07-05), branch conservato su origin
