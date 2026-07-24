# US-005: Allineamento grafico dei modali allo stile Premium Glass

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come utente della piattaforma,
voglio che tutti i modali abbiano lo stesso stile "Premium Glass" (glassmorfismo, bordi arrotondati, palette bordeaux/oro),
così che l'esperienza visiva sia coerente e raffinata in ogni punto dell'applicazione.

**Demonstrates**
After implementing this story, the user can: aprire il proprio profilo da qualsiasi pagina e vedere un modale completo e coerente con il design system, al posto dell'attuale placeholder.

**Acceptance Criteria**
- [ ] Tutti i modali in `src/components/modals` rispettano il design system Premium Glass (backdrop-blur, `rounded-xl`+, palette bordeaux/oro)
- [ ] `ProfileModal.tsx` è rifattorizzato da placeholder a modale funzionante con i dati del profilo utente
- [ ] I modali sono utilizzabili e leggibili anche su viewport mobile

**Status:** DONE
**Plan:** [docs/planning/US-005-plan.md](../planning/US-005-plan.md)

