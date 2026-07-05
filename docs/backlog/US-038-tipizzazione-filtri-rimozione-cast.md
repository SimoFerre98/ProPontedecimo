# US-038: Tipizzazione dei filtri e rimozione dei cast `as any`

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** MEDIUM | **Story Points:** 2 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio tipi espliciti per gli oggetti filtro di atleti e pagamenti, eliminando i cast `as any`,
così che il compilatore intercetti gli errori sui filtri invece di lasciarli passare a runtime.

**Demonstrates**
After implementing this story, the user can: rinominare un campo filtro e vedere il compilatore segnalare tutti i punti da aggiornare, senza cast che nascondono il tipo.

**Acceptance Criteria**
- [ ] Esistono tipi espliciti per i filtri (es. `AthletesFilters`) in `src/types`
- [ ] I cast `as any` e i parametri `(p: any)` in pagine e services sono rimossi (es. `Athletes.tsx`, `Payments.tsx`)
- [ ] Le firme dei services accettano i tipi filtro espliciti
- [ ] Nessun nuovo `any` viene introdotto

**Context**
Dall'analisi architetturale: ~12 usi di `any`, tra cui `athleteService.getPlayers(..., filters as any)` e `filter((p: any) => p.status === 'paid')`.

**Status:** TODO
**Plan:** —
