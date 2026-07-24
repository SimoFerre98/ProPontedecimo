# US-041: Revisione contrasti e leggibilità del tema scuro

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come utente della piattaforma,
voglio che tutti gli elementi dell'interfaccia siano ben leggibili sia nel tema scuro che in quello chiaro,
così che nessuna informazione (testi secondari, bordi, badge, placeholder) risulti poco visibile o si perda sullo sfondo.

**Demonstrates**
After implementing this story, the user can: navigare tutte le pagine in tema scuro senza incontrare testi o controlli difficili da distinguere dallo sfondo.

**Acceptance Criteria**
- [x] Audit sistematico di leggibilità su tutte le pagine e i modali, in entrambi i temi, con elenco dei punti critici documentato
- [x] Gli elementi poco visibili individuati (testi `muted`, bordi `white/5`, placeholder, badge, stati disabled) raggiungono un contrasto adeguato — riferimento indicativo WCAG AA per il testo
- [x] Le correzioni passano dai token centralizzati in `src/index.css` dove esistono (niente fix puntuali sparsi che divergono dal design system)
- [x] Il carattere Premium Glass (glassmorfismo, palette bordeaux/oro) è preservato: si corregge il contrasto, non si stravolge l'estetica
- [x] Verifica finale in entrambi i temi senza regressioni visive

**Context**
Richiesta di Simone (2026-07-06): nel tema scuro "alcune cose sono poco visibili". I punti specifici noti vanno raccolti da Simone in fase di planning/audit e aggiunti a questa issue. Correlata a US-005 (stile modali) e US-039 (componenti condivisi): da implementare preferibilmente dopo US-005 per non lavorare due volte sugli stessi file.

**Status:** DONE
**Plan:** [docs/planning/US-041-plan.md](../planning/US-041-plan.md)
