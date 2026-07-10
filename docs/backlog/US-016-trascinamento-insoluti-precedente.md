# US-016: Trascinamento insoluti anno precedente

**Epic:** EP-005 — Gestione Finanziaria e Quote | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come Dirigente,
voglio che all'avvio della nuova stagione gli insoluti della stagione precedente vengano calcolati e riportati nel profilo finanziario corrente dell'atleta come "debito pregresso",
così che nessun credito della società vada perso nel passaggio di stagione.

**Demonstrates**
After implementing this story, the user can: aprire il riepilogo finanziario di un atleta nella nuova stagione e vedere il debito residuo della stagione precedente sommato al dovuto corrente.

**Acceptance Criteria**
- [x] Alla creazione della nuova stagione (via wizard, US-008) il residuo non saldato di ogni atleta importato è calcolato dalle rate non pagate (dipende da US-015)
- [x] Il debito pregresso è visibile come voce distinta nel profilo finanziario corrente dell'atleta
- [x] Un atleta senza insoluti non mostra alcuna voce di debito pregresso
- [x] Il pagamento del debito pregresso è tracciabile come le altre rate

**Status:** DONE
**Plan:** [docs/planning/US-016-plan.md](../planning/US-016-plan.md)

