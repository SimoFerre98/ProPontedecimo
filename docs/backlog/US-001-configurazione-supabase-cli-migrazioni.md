# US-001: Configurazione Supabase CLI e migrazioni versionate

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** HIGH | **Story Points:** 2 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio configurare la Supabase CLI in locale con lo schema del database versionato in migrazioni,
così che ogni modifica allo schema sia tracciata, riproducibile e applicabile sia sul cloud che sulla futura VPS.

**Demonstrates**
After implementing this story, the user can: eseguire `supabase db diff` e generare una migrazione versionata nel repository che riproduce lo schema attuale.

**Acceptance Criteria**
- [x] La Supabase CLI è configurata e collegata al progetto cloud esistente
- [x] Lo schema attuale (tabelle, funzioni, trigger, RPC `get_dashboard_stats`) è esportato come migrazione iniziale versionata nel repository
- [x] Una nuova modifica di schema applicata via migrazione locale si riflette correttamente sull'ambiente cloud
- [x] Il flusso di lavoro delle migrazioni è documentato nel repository

**Status:** DONE
**Plan:** [docs/planning/US-001-plan.md](../planning/US-001-plan.md)
**Merge:** squash su `dev` — commit `4917814` (2026-07-05), branch `feature/us-001-supabase-cli-migrazioni` conservato su origin

