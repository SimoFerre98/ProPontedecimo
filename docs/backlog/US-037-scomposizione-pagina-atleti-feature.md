# US-037: Scomposizione della pagina Atleti in feature folder

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio scomporre `Athletes.tsx` (806 righe) in una feature folder con componenti e hook dedicati,
così che la pagina più complessa dell'app sia leggibile, testabile e faccia da modello per le altre pagine grandi.

**Demonstrates**
After implementing this story, the user can: usare la pagina Atleti esattamente come prima (filtri, ricerca, viste, paginazione), con il codice suddiviso in moduli sotto `src/pages/Athletes/`.

**Acceptance Criteria**
- [ ] `Athletes.tsx` è suddiviso in feature folder: layout principale, vista griglia, vista tabella, pannello filtri e hook per query+filtri
- [ ] Nessun file della feature supera ~300 righe
- [ ] Nessuna regressione funzionale: filtri, ricerca, ordinamento, paginazione e azioni funzionano come prima
- [ ] La struttura adottata è replicabile per `AddAthleteModal.tsx` (726 righe) e le altre pagine grandi

**Context**
Dall'analisi architetturale: `Athletes.tsx` contiene toolbar, filtri, grid, tabella e paginazione inline in un unico file, violando la single responsibility.

**Status:** TODO
**Plan:** —
