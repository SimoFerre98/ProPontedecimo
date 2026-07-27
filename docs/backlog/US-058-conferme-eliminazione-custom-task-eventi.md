# US-058: Conferme di eliminazione custom per Task ed Eventi calendario

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** LOW | **Story Points:** 2 | **Scope:** MVP

**Story**
Come utente che elimina un task o un evento di calendario,
voglio un dialog di conferma coerente con lo stile "glass" del resto dell'app invece del popup nativo del browser,
così che l'esperienza sia uniforme e non stridente col resto dell'interfaccia.

**Demonstrates**
After implementing this story, the user can: eliminare un task dalla board o un evento dal calendario e vedere un modale di conferma in stile Premium Glass, non il popup grigio nativo del browser.

**Acceptance Criteria**
- [ ] [TaskModal.tsx](../../src/components/modals/TaskModal.tsx) non usa più `confirm()` nativo per l'eliminazione task; usa un modale di conferma custom coerente con lo stile app
- [ ] [EventModal.tsx](../../src/components/modals/EventModal.tsx) idem per l'eliminazione evento calendario
- [ ] Il modale di conferma è un componente condiviso riusabile tra i due punti (evitare di duplicare lo stesso markup due volte, in coerenza con lo spirito di US-039 "componenti condivisi")
- [ ] Verifica manuale: eliminazione di un task e di un evento, entrambi con il nuovo modale di conferma, annulla e conferma testati in entrambi i casi

**Context**
Segnalato dall'utente come problema nella sezione "task" del Magazzino, ma l'analisi del codice (2026-07-27) ha chiarito che non esiste una board task dentro `Inventory.tsx`: il `confirm()` nativo del browser si trova in [TaskModal.tsx:121](../../src/components/modals/TaskModal.tsx), usato dalla board Kanban di Gestione Task ([StaffTasks.tsx](../../src/pages/StaffTasks.tsx)), e lo stesso identico pattern è presente anche in [EventModal.tsx:131](../../src/components/modals/EventModal.tsx) per l'eliminazione degli eventi calendario. Story unica per correggere entrambi i punti in un colpo solo, su richiesta esplicita dell'utente in fase di grouping.

**Status:** TODO
