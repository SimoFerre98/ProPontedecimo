# US-040: Fix drag & drop della board Kanban

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** MEDIUM | **Story Points:** 2 | **Scope:** MVP

**Story**
Come membro dello staff,
voglio trascinare le card dei task tra le colonne della board Kanban e vedere lo stato aggiornarsi,
così che la gestione dei task funzioni come l'interfaccia lascia intendere.

**Demonstrates**
After implementing this story, the user can: trascinare una card da "Ready" a "Done" e vedere lo stato del task aggiornato anche dopo un refresh.

**Acceptance Criteria**
- [x] Il drag & drop delle card tra colonne funziona e invoca `onStatusChange` con il nuovo stato
- [x] Il fix non usa cast disonesti: gli handler nativi passano da `onDragStartCapture` (che framer-motion inoltra al DOM) o da un elemento non-motion dedicato
- [x] Il comportamento è verificato manualmente sulla board (trascinamento riuscito + persistenza dello stato)

**Context**
Emerso dalla code review di US-004 (2026-07-05): in `src/components/tasks/KanbanBoard.tsx` la prop `onDragStart` su `motion.div` è un motion prop che framer-motion **filtra e non inoltra al DOM** (verificato nei sorgenti di framer-motion 12.38, `validMotionProps`); il callback framer scatta solo con la prop `drag` attiva, qui assente. Di conseguenza `handleDragStart` non viene mai eseguito, `dataTransfer` resta vuoto e `handleDrop`/`onStatusChange` non scattano: il DnD è verosimilmente non funzionante da sempre (bug pre-esistente, mascherato prima da `(e: any)` e ora da un double-cast). Da verificare funzionalmente e correggere.

**Status:** REVIEW
**Plan:** [docs/planning/US-040-plan.md](../planning/US-040-plan.md)
