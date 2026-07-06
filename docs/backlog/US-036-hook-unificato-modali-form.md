# US-036: Hook unificato per i modali form

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come sviluppatore del progetto,
voglio un hook riutilizzabile (`useFormModal`) che centralizzi loading, submit, invalidazione delle query e gestione errori dei modali,
così che i 10+ modali non ripetano la stessa logica e una correzione valga per tutti.

**Demonstrates**
After implementing this story, the user can: usare qualsiasi modale (es. nuovo atleta, nuovo pagamento) con comportamento identico a prima, con la logica di submit definita in un unico punto.

**Acceptance Criteria**
- [ ] Esiste un hook tipizzato che incapsula stato di loading, submit, `invalidateQueries` e gestione errori (integrata con il sistema toast di US-035)
- [ ] Tutti i modali in `src/components/modals` che seguono il pattern duplicato sono migrati all'hook (es. `AddAthleteModal`, `AddInventoryModal`, `NewPaymentModal`, `MedicalVisitModal`)
- [ ] Nessuna regressione funzionale nei flussi di creazione/modifica esistenti
- [ ] Il pattern è documentato per i modali futuri

**Context**
Dall'analisi architetturale: ogni modale ripete `useState(loading)` + `try/catch` + `invalidateQueries` + `onClose`, con gestione errori assente o solo `console.error`.

**Status:** TODO
**Plan:** —
