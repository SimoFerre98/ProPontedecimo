# US-007: Selettore stagione globale in header

**Epic:** EP-002 — Gestione Stagioni Sportive | **Priority:** HIGH | **Story Points:** 3 | **Scope:** MVP

**Story**
Come Dirigente,
voglio selezionare la stagione attiva da un menu a tendina nell'header,
così che tutti i dati del pannello (atleti, presenze, pagamenti) si filtrino dinamicamente sulla stagione scelta.

**Demonstrates**
After implementing this story, the user can: cambiare stagione dal dropdown in alto a destra e vedere liste atleti e pagamenti aggiornarsi alla stagione selezionata.

**Acceptance Criteria**
- [ ] Il dropdown in header mostra lo storico delle stagioni e quella attiva è evidenziata
- [ ] La stagione selezionata è gestita in uno store Zustand globale (insieme a sessione utente e tema) e persiste alla navigazione tra pagine
- [ ] Atleti, presenze e pagamenti visualizzati rispettano la stagione selezionata
- [ ] Se esiste una sola stagione, il selettore la mostra senza errori né stati vuoti anomali
- [ ] Le stagioni sono caricate dinamicamente dal database (rimosso l'array hardcoded `SEASONS` in `DashboardLayout.tsx`)

**Status:** DONE
**Plan:** [docs/planning/US-007-plan.md](../planning/US-007-plan.md)

