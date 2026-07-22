# US-038: Tipizzazione dei filtri e rimozione dei cast `as any` — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-22

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come sviluppatore del progetto, voglio tipi espliciti per gli oggetti filtro di atleti e pagamenti, eliminando i cast `as any`, così che il compilatore intercetti gli errori sui filtri invece di lasciarli passare a runtime.

**Criteri di Accettazione**
- [ ] Esistono tipi espliciti per i filtri (es. `AthletesFilters`) in `src/types`
- [ ] I cast `as any` e i parametri `(p: any)` in pagine e services sono rimossi (es. `Athletes.tsx`, `Payments.tsx`)
- [ ] Le firme dei services accettano i tipi filtro espliciti
- [ ] Nessun nuovo `any` viene introdotto

> **Nota di scoping:** il `Context` originale della story ("~12 usi di `any`... `filters as any`... `filter((p: any) => ...)`") descrive uno stato del codice precedente alla scomposizione di [US-037](../backlog/US-037-scomposizione-pagina-atleti-feature.md). Verifica puntuale sulla codebase attuale (2026-07-22): `athleteService.ts` non ha alcun `as any` (i filtri sono già un oggetto tipizzato inline, ma duplicato 3 volte); `Payments.tsx` non ha alcun `filter((p: any) => ...)` residuo. Gli `any` reali rimasti sono 4, tutti in `paymentService.ts` (`(p: any)` in `getPayments`, `getPaymentsForExport`, `getPaymentsByPlayer`, `getOverduePayments`), ciascuno seguito da un cast `as unknown as ...` per aggirarlo. Il lavoro effettivo è quindi: consolidare il tipo filtri atleti (oggi duplicato/scollegato), creare da zero un tipo filtri pagamenti (oggi inesistente: i filtri viaggiano come parametri posizionali sparsi), ed eliminare i 4 `any` residui in `paymentService.ts` insieme ai cast che dipendono da essi.

---

## Soluzione Tecnica

Introduciamo un unico file nuovo `src/types/filters.ts` con due tipi named-export, `AthletesFilters` e `PaymentsFilters`: sono due tipi piccoli e correlati (stato di filtro/ordinamento delle pagine lista) e la codebase non ha ancora alcuna convenzione su come organizzare contenuti scritti a mano in `src/types` (oggi contiene solo `database.ts`, generato da Supabase), quindi non ha senso introdurre file separati per due tipi. Il resto della soluzione consiste nel far convergere su questi due tipi condivisi le definizioni oggi duplicate o mancanti, minimizzando il diff sui chiamanti esistenti.

- `AthletesFilters` sostituisce le 3 copie duplicate dell'oggetto filtri inline in `athleteService.ts` (`buildPlayersQuery`, `getPlayers`, `getPlayersForExport`, tutte identiche). `src/pages/Athletes/types.ts` smette di definire `FiltersState` come tipo proprio e diventa un semplice re-export (`export type { AthletesFilters as FiltersState } from '@/types/filters'`): il tipo canonico vive in `src/types` come richiesto dal criterio di accettazione, ma i tre file che oggi importano `FiltersState` da `'../types'` (`useAthletesData.ts`, `AthleteFilterPanel.tsx` — oltre 15 occorrenze —, `AthleteTableView.tsx`) restano invariati, evitando un rename cosmetico su superficie ampia senza beneficio funzionale.
- `PaymentsFilters` è un tipo nuovo (`{ status?, sortBy?, sortDir? }`) che non esiste oggi: raggruppa i 3 parametri che in `paymentService.getPayments`/`getPaymentsForExport`/`buildPaymentsQuery` viaggiano oggi posizionali, lasciando `search` e `seasonId` come parametri separati — lo stesso pattern già in uso in `athleteService.getPlayers` (`search`/`sector` fuori dall'oggetto filtri, `seasonId` in coda), per non introdurre una seconda convenzione di filtro nella stessa codebase.
- I 4 `(p: any)` in `paymentService.ts` diventano `(p: PaymentReference)` (o il `Pick<PaymentReference, ...>` corretto per `getOverduePayments`, che seleziona solo un sottoinsieme di colonne): il `data` restituito da Supabase su questi metodi è oggi implicitamente `any` (ragione per cui serviva l'annotazione esplicita), quindi basta tipizzare il parametro della callback per ottenere `mapped: PaymentReference[]` senza bisogno del cast `as unknown as ...` che seguiva ciascuna mappatura — cast che esisteva solo per aggirare l'`any` a monte.
- `Payments.tsx` costruisce `{ status: statusFilter, sortBy: 'due_date', sortDir: 'asc' }` come `PaymentsFilters` al posto dei 2 parametri posizionali oggi hardcoded nella chiamata — nessuna nuova UI, i valori di ordinamento restano fissi come oggi (non esiste ancora un selettore di ordinamento in questa pagina, e non è nello scope di questa story aggiungerlo).

---

## Strategia di Test

Nessun comportamento nuovo da testare: è un refactoring di tipizzazione puro, quindi l'obiettivo è dimostrare che query, risultati e comportamento a runtime restano identici prima/dopo.

- Verifica statica: `npx tsc --noEmit` deve passare senza errori dopo ogni modifica di firma, e una grep finale su `src/` per `as any` e `(p: any)`/`: any` deve risultare vuota (a parte i type generici legittimi in `src/types/database.ts`, non toccati da questa story).
- Regressione manuale mirata: pagina Atleti — applicare ciascun filtro (stato, tesseramento, visita medica, privacy, matricola, ordinamento) e l'export Excel, verificando che i risultati siano identici a quelli pre-refactor.
- Regressione manuale mirata: pagina Pagamenti — filtro per stato (`all`/`pending`/`paid`/`overdue`) e export Excel, verificando che i risultati (incluso lo stato calcolato `overdue` per le rate scadute) siano identici a prima.
- Prima di segnare la story `DONE`, eseguire comunque `npm run test:integration` per convenzione di progetto (nessuna migrazione toccata da questa story, ma serve escludere regressioni sulle suite che esercitano `athleteService`/`paymentService`, es. wizard nuova stagione).

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Creare `src/types/filters.ts` | Definire `AthletesFilters` (spostato da `athleteService.ts`) e `PaymentsFilters` (nuovo: `status`/`sortBy`/`sortDir`), entrambi con campi opzionali. | Impl | - |
| DONE | TASK-02 | Consolidare `AthletesFilters` in `athleteService.ts` | Sostituire le 3 definizioni inline duplicate (`buildPlayersQuery`, `getPlayers`, `getPlayersForExport`) con l'import di `AthletesFilters` da `@/types/filters`. | Impl | TASK-01 |
| DONE | TASK-03 | Ri-esportare il tipo in `src/pages/Athletes/types.ts` | Rimuovere la definizione locale di `FiltersState` e sostituirla con `export type { AthletesFilters as FiltersState } from '@/types/filters'`, mantenendo invariati `DEFAULT_FILTERS` e `activeFilterCount`. | Impl | TASK-01 |
| DONE | TASK-04 | Introdurre `PaymentsFilters` in `paymentService.ts` | Aggiornare `buildPaymentsQuery`, `getPayments`, `getPaymentsForExport` per accettare `filters?: PaymentsFilters` al posto dei parametri posizionali `status`/`sortBy`/`sortDir`. | Impl | TASK-01 |
| DONE | TASK-05 | Rimuovere i 4 `(p: any)` in `paymentService.ts` | Tipizzare le callback `.map()` in `getPayments`, `getPaymentsForExport`, `getPaymentsByPlayer`, `getOverduePayments` come `PaymentReference` (o `Pick<PaymentReference, ...>` per `getOverduePayments`) e rimuovere i cast `as unknown as ...`/`as ...` divenuti superflui. | Impl | TASK-04 |
| DONE | TASK-06 | Aggiornare i call site in `Payments.tsx` | Costruire l'oggetto `PaymentsFilters` (`{ status: statusFilter, sortBy: 'due_date', sortDir: 'asc' }`) nelle 2 chiamate a `getPayments`/`getPaymentsForExport`. | Impl | TASK-04 |
| DONE | TASK-07 | Verifica statica | Eseguire `npx tsc --noEmit` e correggere eventuali errori residui; grep su `src/` per confermare l'assenza di `as any`/`(p: any)`. | Test | TASK-02, TASK-03, TASK-05, TASK-06 |
| DONE | TASK-08 | Regressione manuale Atleti/Pagamenti | Verificare manualmente filtri, ordinamento ed export su entrambe le pagine; eseguire `npm run test:integration` per escludere regressioni cross-story. | Test | TASK-07 |

---

_Piano generato via Archetipo Planning — 2026-07-22_
