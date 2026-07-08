# US-010: Gestione numero matricola

**Epic:** EP-003 — Anagrafica Atleti & Validazione | **Priority:** MEDIUM | **Story Points:** 2 | **Scope:** MVP

**Story**
Come Dirigente,
voglio registrare il numero di matricola di ciascun atleta nei form di inserimento e modifica,
così che il tesseramento federale sia tracciato nel gestionale.

**Demonstrates**
After implementing this story, the user can: inserire o aggiornare la matricola di un atleta e vederla nella sua scheda.

**Acceptance Criteria**
- [ ] Il campo `registration_number` è aggiunto alla tabella `players` via migrazione
- [ ] Il campo matricola è presente nei form di inserimento e modifica atleta e viene salvato correttamente
- [ ] La matricola è visibile nella scheda/lista atleti
- [ ] Il campo è facoltativo al salvataggio (i nuovi iscritti possono non averla ancora)

**Status:** PLANNED
**Plan:** [US-010-plan.md](../planning/US-010-plan.md)

