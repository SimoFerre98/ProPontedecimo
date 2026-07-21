# US-037: Scomposizione della pagina Atleti in feature folder — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-21

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come sviluppatore del progetto, voglio scomporre `Athletes.tsx` (806 righe) in una feature folder con componenti e hook dedicati, così che la pagina più complessa dell'app sia leggibile, testabile e faccia da modello per le altre pagine grandi.

**Criteri di Accettazione**
- [ ] `Athletes.tsx` è suddiviso in feature folder: layout principale, vista griglia, vista tabella, pannello filtri e hook per query+filtri
- [ ] Nessun file della feature supera ~300 righe
- [ ] Nessuna regressione funzionale: filtri, ricerca, ordinamento, paginazione e azioni funzionano come prima
- [ ] La struttura adottata è replicabile per `AddAthleteModal.tsx` (726 righe) e le altre pagine grandi

**Nota:** al momento della pianificazione `Athletes.tsx` è a **1011 righe** (non 806 come indicato nella story originale) — è cresciuto nel frattempo con l'aggiunta dei banner insoluti/matricola mancante e l'export Excel. Non cambia lo scope della story, ne rafforza la motivazione.

---

## Soluzione Tecnica

Il refactor introduce una feature folder `src/pages/Athletes/` con un `index.tsx` come guscio sottile di orchestrazione, un hook che concentra query e stato filtri, e componenti di presentazione puri per le due viste dati e il pannello filtri — lo stesso stile "smart container + dumb children" già implicito nel resto dell'app, applicato per la prima volta a livello di pagina.

- **`src/pages/Athletes/index.tsx`**: header, banner insoluti/matricola mancante, stats cards, toolbar (ricerca/settore/vista/export), orchestrazione dei componenti figli e dei tre modali esistenti (`AddAthleteModal`, `DeleteAthleteModal`, `PlayerPaymentSummaryModal`). Resta default export: `import Athletes from '@/pages/Athletes'` in `App.tsx` non richiede modifiche, una cartella con `index.tsx` risolve identicamente a un file.
- **`src/pages/Athletes/hooks/useAthletesData.ts`**: incapsula le 4 query TanStack (`players`, `overduePaymentsCount`, `missingRegistrationCount`, `sectors`), lo stato `filters`/`pendingFilters`, `applyFilters`/`resetFilters`/`setPending`/`handleSort` e `handleExport`. Ritorna un unico oggetto piatto consumato da `index.tsx`. Il gioco `filters` vs `pendingFilters` e `handleSort` (che aggiorna entrambi in sincrono) vengono portati così come sono, senza modificarne la logica.
- **`src/pages/Athletes/components/AthleteFilterPanel.tsx`**: pannello filtri avanzati + chip filtri attivi (le due sezioni più dense del file originale), riceve `filters`/`pendingFilters`/`availableSectors` e le callback dall'hook via props.
- **`src/pages/Athletes/components/AthleteGridView.tsx`** e **`components/AthleteTableView.tsx`**: le due viste dati, ciascuna riceve `players`, `isAdmin`, callback di ordinamento (solo tabella) e le callback di apertura modali (`onOpenDetails`, `onOpenSummary`, `onDelete`) — nessuna query propria.
- **`src/pages/Athletes/types.ts`**: `FiltersState` e `DEFAULT_FILTERS`, oggi locali al file e non importati altrove (verificato via grep: nessun modulo esterno usa `FiltersState`).
- **Fuori scope, con motivazione esplicita**: `AddAthleteModal.tsx` non viene rifattorizzato in questa story. L'AC4 è un vincolo di stile ("la struttura deve essere replicabile là"), non un task aggiuntivo — coerente con la nota di scoping già usata in US-036 per evitare di allargare una story di refactoring oltre il suo perimetro dichiarato.
- **Nessuna nuova dipendenza npm, nessuna modifica a `athleteService`/`paymentService`**: il refactor sposta dove le funzioni di servizio vengono chiamate, non cosa fanno.

---

## Strategia di Test

Come per US-035/US-036, il progetto non ha un framework di test frontend configurato: la verifica è manuale via browser, a comportamento identico rispetto a prima del refactor, più il controllo statico dei tipi. Nessuna migrazione DB coinvolta, quindi non serve `npm run test:integration`.

- Verifica manuale delle due viste (griglia e tabella): dati visualizzati identici, azioni (Dettagli, Pagamenti, Elimina per admin) invariate
- Verifica manuale del pannello filtri avanzati: ogni filtro (stato squadra, tesseramento, visita medica, privacy, matricola, ordinamento) applica e resetta correttamente, i chip dei filtri attivi si rimuovono singolarmente
- Verifica specifica di `handleSort`: click sulle intestazioni ordinabili in vista tabella aggiorna sia `filters` che `pendingFilters` in modo sincrono (il bug più probabile in questo refactor, secondo Ugo)
- Verifica di non-regressione sui due invalidate multipli già esistenti (`AddAthleteModal`/`DeleteAthleteModal` → `players` + `missingRegistrationCount`): confermare che il wiring in `index.tsx` li preservi entrambi
- Verifica dei banner cliccabili (insoluti → naviga a `/pagamenti`; matricola mancante → applica filtro `registrationStatus: missing`) e dell'export Excel (`handleExport`)
- Verifica di paginazione e ricerca/filtro per settore nella toolbar
- `npx tsc --noEmit` a fine implementazione, come da convenzione di progetto prima di ogni review

🧪 **Mina:** Il punto da non derubricare in un refactor puro è che ogni step intermedio sia verificabile "a comportamento identico", non solo "compila senza errori di tipo".

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Creare `types.ts` | Estrarre `FiltersState`, `DEFAULT_FILTERS` e `activeFilterCount` in `src/pages/Athletes/types.ts` | Impl | - |
| TODO | TASK-02 | Creare hook `useAthletesData` | Estrarre le 4 query, lo stato filtri/pendingFilters, `applyFilters`/`resetFilters`/`setPending`/`handleSort`/`handleExport` in `src/pages/Athletes/hooks/useAthletesData.ts` | Impl | TASK-01 |
| TODO | TASK-03 | Creare `AthleteFilterPanel.tsx` | Estrarre pannello filtri avanzati + chip filtri attivi in un componente puro | Impl | TASK-01 |
| TODO | TASK-04 | Creare `AthleteGridView.tsx` | Estrarre la vista griglia in un componente puro, props per dati e callback | Impl | TASK-01 |
| TODO | TASK-05 | Creare `AthleteTableView.tsx` | Estrarre la vista tabella (incluso ordinamento colonne) in un componente puro | Impl | TASK-01 |
| TODO | TASK-06 | Assemblare `index.tsx` | Riscrivere il file principale come guscio di orchestrazione: header, banner, stats, toolbar, wiring dell'hook, dei 3 componenti e dei 3 modali esistenti; rimuovere il vecchio `Athletes.tsx` | Impl | TASK-02, TASK-03, TASK-04, TASK-05 |
| TODO | TASK-07 | Verifica manuale viste dati | Testare griglia e tabella: dati, azioni Dettagli/Pagamenti/Elimina, invariati rispetto a prima | Test | TASK-06 |
| TODO | TASK-08 | Verifica manuale pannello filtri | Testare ogni filtro, applica/reset, chip rimovibili singolarmente | Test | TASK-06 |
| TODO | TASK-09 | Verifica manuale ordinamento | Testare `handleSort` su ogni colonna ordinabile, confermando sincronia `filters`/`pendingFilters` | Test | TASK-06 |
| TODO | TASK-10 | Verifica manuale banner, export, paginazione | Testare banner insoluti/matricola (click e navigazione/filtro), export Excel, ricerca, filtro settore, paginazione | Test | TASK-06 |
| TODO | TASK-11 | Verifica dimensione file | Confermare che nessun file della feature superi ~300 righe; se un file la supera, valutare un'ulteriore estrazione mirata | Test | TASK-06 |
| TODO | TASK-12 | Verifica finale type-check | Eseguire `npx tsc --noEmit` e correggere eventuali errori residui prima della review | Test | TASK-07, TASK-08, TASK-09, TASK-10, TASK-11 |

---

_Piano generato via Archetipo Planning — 2026-07-21_
