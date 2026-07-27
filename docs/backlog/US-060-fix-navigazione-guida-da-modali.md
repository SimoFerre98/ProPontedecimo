# US-060: Fix navigazione Guida da modali aperti

**Epic:** EP-015 — Documentazione e Supporto Utente | **Priority:** MEDIUM | **Story Points:** 2 | **Scope:** MVP

**Story**
Come utente che ha un modale aperto (es. profilo atleta) e consulta la Guida dal menu utente,
voglio poter tornare al modale/pagina di partenza,
così che consultare la Guida non mi faccia perdere il contesto in cui stavo lavorando.

**Demonstrates**
After implementing this story, the user can: aprire il profilo di un atleta, andare in Guida dal menu utente, e tornare indietro ritrovando il profilo atleta aperto (o quantomeno la stessa pagina/contesto di provenienza in modo prevedibile).

**Acceptance Criteria**
- [ ] Navigare verso `/guida` o `/portal/guida` mentre un modale è aperto su un'altra pagina (es. dettaglio atleta) e poi tornare indietro riporta l'utente al contesto di provenienza, non semplicemente alla lista con il modale chiuso
- [ ] Soluzione minima e mirata (KISS): usare `location.state` per passare l'informazione di provenienza, senza refactoring globale della gestione modali verso routing basato su URL
- [ ] La pagina Guida ha un modo esplicito per tornare indietro (bottone o link), non solo affidarsi al tasto back del browser
- [ ] Verifica manuale sia da `DashboardLayout` (staff) sia da `PortalLayout` (genitore/atleta), visto che entrambi hanno una propria voce menu "Guida"

**Context**
Analisi del codice (2026-07-27): non esiste un link diretto "Guida" dentro il profilo atleta — la voce si trova solo nel menu utente ([DashboardLayout.tsx:387-396](../../src/layouts/DashboardLayout.tsx), [PortalLayout.tsx:131-136](../../src/layouts/PortalLayout.tsx)). Il problema reale: il "profilo atleta" in [Athletes/index.tsx](../../src/pages/Athletes/index.tsx) non è una route separata ma uno stato React locale (`isModalOpen`/`selectedPlayer`) mai riflesso nell'URL. Quando l'utente naviga verso `/guida`, React Router smonta la pagina Athletes (perdendo quello stato); il "torna indietro" del browser rimonta la pagina da zero, senza il modale riaperto. Il bug non è nel router in sé, ma nel fatto che l'apertura del profilo non è mai persistita nella history — quindi qualunque navigazione fuori da Athletes (non solo verso la Guida) perde il profilo aperto.

**Status:** TODO
