# US-056: Guida — Portali Genitore, Giocatore e Allenatore — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** LOW | **Story Points:** 3

**Story**
Come genitore, giocatore o allenatore, voglio un capitolo della guida dedicato al mio portale (bilancio dei figli, convocazioni, calendario della leva, gestione della squadra), con screenshot, così che possa usare le funzionalità pensate per il mio ruolo senza incertezze.

**Criteri di Accettazione**
- [ ] È documentato con screenshot, per il genitore, come consultare bilancio e scadenze dei figli associati (vedi US-027/US-028)
- [ ] È documentato con screenshot, per il giocatore, come consultare le convocazioni pubblicate (vedi US-030)
- [ ] È documentato con screenshot, per l'allenatore, come gestire le convocazioni e il pannello atleti della propria squadra (vedi US-032/US-033)
- [ ] I tre sotto-capitoli sono raggiungibili dallo stesso indice della guida, così che ogni utente trovi naturalmente solo i capitoli relativi alle funzionalità già presenti nel proprio menu, senza bisogno di filtri di visibilità dedicati

---

## Soluzione Tecnica

Nessuna modifica al database. Il quarto AC richiede esplicitamente di **non** introdurre un nuovo meccanismo di filtro dedicato: la story riusa il meccanismo `variant` già presente in `GuideChapterComponentProps` e già passato da `Guide.tsx` a ogni capitolo attivo (lo stesso pattern di `PrimiPassiChapter.tsx`). L'entry esistente `portali-genitore-giocatore-allenatore` resta un'unica voce nell'indice (`audience: 'both'`, come già previsto per essere visibile sia da Staff che da Portale), ma il componente rende contenuti diversi in base a `variant`:
- `variant === 'portal'` (giocatore o genitore, non distinguibili a livello di Guide — coerente con la granularità binaria staff/portal già stabilita da US-050): mostra i sotto-capitoli "Portale Genitore" (bilancio e scadenze dei figli, da `ChildBillingCard.tsx`) e "Portale Giocatore" (convocazioni pubblicate, da `NextCallUpCard.tsx`).
- `variant === 'staff'` (coach incluso): mostra il sotto-capitolo "Portale Allenatore" (gestione convocazioni da `Convocazioni.tsx` — pubblica/ritira, stato Convocati/Rosa — e pannello squadra da `SquadraAtleti.tsx`).

- Nuovo componente `src/components/guide/chapters/PortaliChapter.tsx`, variant-aware, con i 3 sotto-capitoli verificati contro il codice reale.
- Aggiornare l'entry `portali-genitore-giocatore-allenatore` in `guideChapters.tsx`: `status: 'available'`, `audience: 'both'`, `Component: PortaliChapter`.

---

## Strategia di Test

Nessuna suite `scripts/test-*.mjs` interessata. `npx tsc --noEmit` per questa story. `npm run test:integration` e verifica manuale eseguiti una sola volta al termine dell'intera batch EP-015 (US-051→US-056): la verifica manuale include esplicitamente il controllo che il lato Portale mostri i sotto-capitoli Genitore/Giocatore e il lato Staff mostri il sotto-capitolo Allenatore, per questa story in particolare.

---

## Task di Implementazione

| Stato | # | Task | Descrizione |
|---|---|---|---|
| DONE | TASK-01 | Componente `PortaliChapter.tsx` | Creare il capitolo variant-aware con i 3 sotto-capitoli (Genitore, Giocatore, Allenatore) |
| DONE | TASK-02 | Registrazione capitolo | `status: 'available'`, `audience: 'both'`, `Component: PortaliChapter` |

---

_Piano generato via Archetipo Planning — 2026-07-27_
