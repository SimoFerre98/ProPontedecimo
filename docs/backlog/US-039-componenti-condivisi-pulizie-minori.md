# US-039: Componenti condivisi e pulizie minori

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** LOW | **Story Points:** 2 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio componenti condivisi per spinner e card statistiche e la rimozione delle piccole duplicazioni note,
così che l'interfaccia resti coerente e il codice non accumuli micro-debiti.

**Demonstrates**
After implementing this story, the user can: vedere spinner e card statistiche identici in tutte le pagine, e nessuno schermo bianco durante il caricamento delle route protette.

**Acceptance Criteria**
- [ ] Un componente `LoadingSpinner` condiviso sostituisce le ~29 implementazioni ripetute di `animate-spin`/`Loader2`
- [ ] Un componente `StatsGrid` riutilizzabile sostituisce le card statistiche duplicate in Payments, Inventory e MedicalVisits
- [ ] `RoleGuard` mostra lo spinner durante il loading invece di ritornare `null` (schermo bianco)
- [ ] Il metodo duplicato `deleteAthlete`/`deletePlayer` in `athleteService.ts` è consolidato in uno solo

**Status:** DONE
**Plan:** [docs/planning/US-039-plan.md](../planning/US-039-plan.md)
