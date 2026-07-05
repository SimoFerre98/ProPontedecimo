# US-003: Indici database per filtri atleti e pagamenti

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** MEDIUM | **Story Points:** 2 | **Scope:** MVP

**Story**
Come Dirigente,
voglio che le liste di atleti e pagamenti filtrate si carichino rapidamente,
così che il lavoro quotidiano di consultazione non subisca rallentamenti al crescere dei dati.

**Demonstrates**
After implementing this story, the user can: filtrare la lista atleti per stato attivo o scadenza medica con tempi di risposta ridotti, verificabili dal query plan.

**Acceptance Criteria**
- [ ] Gli indici `idx_players_is_active`, `idx_players_medical_expiry` e `idx_payments_status` sono creati via migrazione
- [ ] Il query plan (`EXPLAIN`) delle query di filtro atleti e pagamenti utilizza i nuovi indici
- [ ] Nessuna regressione funzionale nelle liste esistenti dopo l'applicazione degli indici

**Status:** IN PROGRESS
**Plan:** [docs/planning/US-003-plan.md](../planning/US-003-plan.md)

