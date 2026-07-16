# US-043: Migrazione schema e configurazioni dal cloud

**Epic:** EP-009 — Deploy VPS, Migrazione & Backup | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** Growth

**Story**
Come sviluppatore del progetto,
voglio esportare schema DDL, policy RLS, funzioni e trigger da Supabase Cloud e applicarli sulla VPS escludendo i dati di test,
così che la produzione parta da uno schema identico e pulito.

**Demonstrates**
After implementing this story, the user can: verificare che tabelle, RLS e funzioni sulla VPS coincidano con quelle del cloud, senza dati di test.

**Acceptance Criteria**
- [ ] Le migrazioni versionate (US-001) si applicano con successo sull'istanza self-hosted (dipende da US-042)
- [ ] Policy RLS, funzioni e trigger risultano identici tra cloud e VPS
- [ ] Nessun dato di test è presente sull'ambiente di produzione
- [ ] Il flusso di autenticazione (signup/login) funziona sull'istanza self-hosted

**Status:** TODO
**Plan:** —

