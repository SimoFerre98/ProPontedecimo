# US-002: Policy RLS per tutti i ruoli

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** HIGH | **Story Points:** 5 | **Scope:** MVP

**Story**
Come Presidente,
voglio che l'accesso ai dati sia regolato da policy Row Level Security basate sui ruoli (`president`, `director`, `coach`, `player`, `parent`),
così che ogni utente veda ed operi solo sui dati di propria competenza.

**Demonstrates**
After implementing this story, the user can: accedere con un account Allenatore e vedere solo gli atleti della propria squadra, senza alcuna visibilità sui dati finanziari globali.

**Acceptance Criteria**
- [ ] Il Presidente ha accesso CRUD completo su tutte le tabelle
- [ ] Il Dirigente può gestire anagrafiche, pagamenti e scadenze mediche ma non i ruoli dello staff
- [ ] L'Allenatore accede in CRUD solo agli atleti della propria squadra/leva e non vede i dettagli finanziari globali
- [ ] Giocatore e Genitore hanno accesso in sola lettura limitato rispettivamente al proprio profilo e ai figli associati
- [ ] Un tentativo di accesso a dati fuori competenza (via API diretta) restituisce un risultato vuoto o un errore, mai i dati
- [ ] Le policy sono versionate come migrazione (dipende da US-001)

**Status:** IN PROGRESS
**Plan:** [docs/planning/US-002-plan.md](../planning/US-002-plan.md)

