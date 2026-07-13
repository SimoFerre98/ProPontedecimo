# US-035: Gestione errori globale e feedback utente

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** HIGH | **Story Points:** 3 | **Scope:** MVP

**Story**
Come utente della piattaforma,
voglio che ogni errore di caricamento o salvataggio venga segnalato con un messaggio chiaro,
così che io non mi trovi mai davanti a pagine vuote o salvataggi falliti in silenzio.

**Demonstrates**
After implementing this story, the user can: simulare un errore di rete e vedere un messaggio d'errore comprensibile (toast o stato inline) invece di un'interfaccia vuota.

**Acceptance Criteria**
- [ ] Un Error Boundary globale intercetta gli errori di rendering e mostra una schermata di fallback con possibilità di ricaricare
- [ ] Le query fallite (`isError`) mostrano un messaggio di errore visibile all'utente, non un'interfaccia vuota (oggi nessuna pagina gestisce l'errore, es. `Athletes.tsx`)
- [ ] Le mutazioni fallite nei modali mostrano un errore chiaro e non chiudono il modale perdendo i dati inseriti
- [ ] È introdotto un sistema di toast/notifiche unificato, coerente con il design system Premium Glass

**Context**
Dall'analisi architetturale: solo 2 gestioni errori in tutta l'app (LoginPage, RegisterPage); i services fanno `throw error` ma nessun componente li cattura; nessun error boundary presente.

**Status:** IN PROGRESS
**Plan:** [docs/planning/US-035-plan.md](../planning/US-035-plan.md)
