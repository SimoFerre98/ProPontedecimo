# US-049: Infrastruttura guida in-app e voce di menu

**Epic:** EP-015 — Documentazione e Supporto Utente | **Priority:** HIGH | **Story Points:** 3 | **Scope:** MVP

**Story**
Come utente di qualsiasi ruolo, spesso poco esperto di informatica,
voglio una sezione "Guida" raggiungibile dal menu in alto a destra, accanto alle voci di gestione account,
così che possa orientarmi nel sito senza dover chiedere aiuto ad altri.

**Demonstrates**
After implementing this story, the user can: aprire il menu utente in alto a destra, cliccare sulla voce "Guida", vedere l'indice dei capitoli disponibili e leggere il capitolo introduttivo "Primi passi" con almeno uno screenshot.

**Acceptance Criteria**
- [ ] Nel menu utente in alto a destra (lo stesso menu con le voci di gestione account/impostazioni, vedi US-018/US-020) è presente una voce "Guida" (o "Aiuto") chiaramente distinta dalle voci di configurazione account
- [ ] Cliccando la voce si apre una sezione dedicata interamente interna al sito (nessun redirect a PDF, wiki esterno o altro dominio)
- [ ] La sezione mostra un indice/sommario dei capitoli disponibili, navigabile senza ricaricare la pagina
- [ ] È presente almeno un capitolo "Primi passi" con testo semplice e non tecnico e almeno uno screenshot che mostra la struttura generale del sito (menu principale, posizione del menu utente, significato delle icone base)
- [ ] I contenuti (testo + immagini) sono gestiti come asset statici del progetto (Markdown o componenti React), senza necessità di un pannello di amministrazione dedicato
- [ ] La sezione è raggiungibile e leggibile correttamente anche da schermo mobile

**Status:** PLANNED
**Plan:** docs/planning/US-049-plan.md

