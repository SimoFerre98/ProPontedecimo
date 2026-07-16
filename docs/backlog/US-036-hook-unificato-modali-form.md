# US-036: Hook unificato per i modali form

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio un hook riutilizzabile (`useFormModal`) che centralizzi loading, submit, invalidazione delle query e gestione errori dei modali,
così che i 10+ modali non ripetano la stessa logica e una correzione valga per tutti.

**Demonstrates**
After implementing this story, the user can: usare qualsiasi modale (es. nuovo atleta, nuovo pagamento) con comportamento identico a prima, con la logica di submit definita in un unico punto.

**Acceptance Criteria**
- [x] Esiste un hook tipizzato che incapsula stato di loading, submit, `invalidateQueries` e gestione errori (integrata con il sistema toast di US-035)
- [x] Tutti i modali in `src/components/modals` che seguono il pattern duplicato sono migrati all'hook (es. `AddAthleteModal`, `AddInventoryModal`, `NewPaymentModal`, `MedicalVisitModal`) — vedi nota di scoping nel piano: 5 modali condividono davvero il pattern (i due elencati sopra più `PaymentModal` e `MedicalVisitModal`), gli altri 9 sono fuori scope con motivazione documentata
- [x] Nessuna regressione funzionale nei flussi di creazione/modifica esistenti
- [x] Il pattern è documentato per i modali futuri

**Context**
Dall'analisi architetturale: ogni modale ripete `useState(loading)` + `try/catch` + `invalidateQueries` + `onClose`, con gestione errori assente o solo `console.error`.

**Status:** DONE
**Plan:** [docs/planning/US-036-plan.md](../planning/US-036-plan.md)
