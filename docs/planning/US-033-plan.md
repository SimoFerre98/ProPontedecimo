# US-033: Pannello gestione atleti della squadra — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-21

---

## User Story

**Epic:** EP-012 — Portale Allenatore
**Priorità:** LOW | **Story Points:** 3

**Story**
Come Allenatore,
voglio un pannello dedicato con anagrafica e stato delle visite mediche degli atleti della mia squadra,
così che io abbia sotto controllo l'idoneità sportiva dei miei ragazzi senza passare dalla dirigenza.

**Criteri di Accettazione**
- [ ] L'allenatore vede anagrafica e scadenze mediche dei soli atleti della propria squadra (RLS di US-002)
- [ ] Le visite mediche scadute o in scadenza sono evidenziate visivamente
- [ ] Nessun dato finanziario è visibile all'allenatore

> **Nota (Emanuele):** gli AC1 e AC3 sono già garantiti a livello database da migrazioni esistenti (US-002/US-017), non richiedono nuovo lavoro sullo schema: `players_select_coach` scopa la lettura per `team_sector` tramite `get_coach_sectors()`, `medical_select_coach` scopa per `is_coach_of_player`, e non esiste (né va introdotta) alcuna policy `payments_select_coach` — l'allenatore non ha mai avuto accesso a `payments`. Questa story è quindi puramente un lavoro di UI: dare all'allenatore un pannello dedicato che oggi non esiste.
>
> La soglia "scaduta/in scadenza" (AC2) non era definita negli AC: riuso la convenzione già esistente in `medicalService.calculateStatus()` (30 giorni, 4 stati: valid/expiring/expired/missing) invece di introdurne una nuova.
>
> **Assunzione (grana grossa, story Vision):** per "anagrafica" si intendono nome, cognome, data di nascita, tessera FIGC e leva — non i contatti dei genitori, non richiesti esplicitamente dagli AC e non necessari all'allenatore per il controllo dell'idoneità sportiva.

---

## Soluzione Tecnica

Questa story non richiede alcuna nuova migrazione: il lavoro è ricombinare pattern UI già in produzione dietro RLS già esistenti, non costruire nuove garanzie di sicurezza.

- **Nuovo metodo `getSquadRoster(seasonId, sector?)`** in `medicalService.ts` (stesso file di dominio che già possiede `calculateStatus()` e la shape "player + medical_expiry"): query non paginata su `players` (`id, first_name, last_name, birth_date, figc_registration, team_sector, medical_expiry`, filtrata per `season_id`/`is_active`, opzionale `team_sector`), sullo stile di `attendanceService.getRosterForAttendance`. Nessuna paginazione: la squadra di un allenatore è tipicamente una ventina di atleti, coerente con l'approccio già usato in `Attendance.tsx`/`Convocazioni.tsx` (fetch completo, non un datagrid con conteggio server-side).
- **Estrazione di `MedicalStatusIndicator`** da `MedicalVisits.tsx` (oggi `StatusIndicator` è locale alla pagina) in un componente condiviso `src/components/MedicalStatusIndicator.tsx`: stessa logica di badge colorato (valid/expiring/expired/missing) con didascalia "Scade tra N giorni"/"Scaduta da N giorni", riusata identica sia dall'admin sia dal nuovo pannello coach invece di duplicare la logica di colore/soglia. Refactor puramente estrattivo, nessun cambio di comportamento su `MedicalVisits.tsx`.
- **Nuova pagina `SquadraAtleti.tsx`**: ricalca il pattern di derivazione leve già usato in `Convocazioni.tsx` (fetch roster non scopato esplicitamente in query, RLS applica il filtro server-side, `Set` di `team_sector` per generare i chip quando l'allenatore ha più leve). Card `glass-card` per atleta con anagrafica essenziale + `MedicalStatusIndicator`. Nessuna azione di scrittura: la story è di sola visualizzazione, coerente con il fatto che le policy RLS del coach su `players`/`medical_visits` sono comunque SELECT-only.
- **Stato vuoto onesto**: se l'allenatore non ha atleti attivi (leva vuota o stagione senza iscritti), il pannello mostra un empty-state esplicito invece di uno schermo bianco — stesso principio già applicato in US-030 per lo stato "nessuna partita".
- **Routing**: nuova rotta `squadra` nello stesso branch Staff (`RoleGuard` invariato: president/director/coach) in `App.tsx`; voce in `NAV_ITEMS` di `DashboardLayout.tsx` e aggiunta al whitelist array del coach (`['/', '/atleti', '/presenze', '/convocazioni', '/task']` → include `/squadra`). President/director la vedranno anch'essi in navigazione, stesso comportamento già esistente per `/convocazioni` — non è un caso speciale da gestire.

**Nota (Ugo):** l'estrazione di `MedicalStatusIndicator` tocca `MedicalVisits.tsx`, una pagina già in uso — va fatta come semplice "extract component" senza alterarne il comportamento, verificata con un confronto visivo manuale pre/post estrazione.

**Nota (Leonardo, valutazione mockup — Fase 2.5):** nessuna sessione di design dedicata è necessaria. Il linguaggio visivo richiesto esiste già in produzione su due pagine live (non semplici mockup): i badge di stato medico di `MedicalVisits.tsx` e il pattern chip-leva/roster-card di `Convocazioni.tsx`/`Attendance.tsx`. Ricombinarli non introduce alcuna decisione visiva nuova.

---

## Strategia di Test

Il rischio principale non è una nuova regola di sicurezza (non ce ne sono) ma la garanzia che il nuovo pannello, pur senza introdurre RLS, esponga correttamente ciò che le policy esistenti già permettono — in particolare per un allenatore con più leve — e non esponga mai un dato finanziario.

- **Integrazione (nuovo `scripts/test-squad-panel.mjs`)**: un allenatore con una sola leva vede solo i propri atleti attivi; un allenatore con più leve (assegnate tramite `get_coach_sectors()`) vede gli atleti di tutte le proprie leve e nessun atleto di una leva non assegnata; la query di `getSquadRoster` non seleziona né restituisce mai colonne di `payments`; un allenatore senza atleti attivi in stagione riceve una lista vuota (non un errore).
- **Regressione (obbligatoria pre-merge)**: `npx supabase db reset` seguito da `npm run test:integration` — in particolare `test-rls.mjs`, dato che questa story consuma `players_select_coach`/`medical_select_coach` senza modificarle, e va verificato che restino coerenti con l'uso che ne fa il nuovo pannello.
- **Type-check**: `npx tsc -p tsconfig.app.json --noEmit` (il comando `npx tsc --noEmit` alla radice non è affidabile in questo repo: il `tsconfig.json` root ha `"files": []` e non compila nulla senza `-b`).
- **Manuale (UI, per ruolo)**: login come `coach` con una sola leva → verifica anagrafica ed evidenza scadenze mediche corrette; login come `coach` con più leve → verifica chip di selezione leva e conteggio corretto per ciascuna; login come `coach` senza atleti attivi → verifica empty-state onesto; verifica che nessun elemento di UI mostri o richieda dati di `payments`; confronto visivo di `MedicalVisits.tsx` prima/dopo l'estrazione di `MedicalStatusIndicator` per escludere regressioni; login come `president`/`director` → verifica di vedere la nuova voce di navigazione e poter aprire il pannello senza restrizioni di leva.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Estrazione `MedicalStatusIndicator` | Estrarre `StatusIndicator` da `MedicalVisits.tsx` in `src/components/MedicalStatusIndicator.tsx`, aggiornare `MedicalVisits.tsx` per usare il componente condiviso senza cambiarne il comportamento | Impl | - |
| TODO | TASK-02 | Service layer `getSquadRoster` | Aggiungere `getSquadRoster(seasonId, sector?)` a `medicalService.ts`: query non paginata su `players` con anagrafica essenziale + `medical_expiry`, filtrata per stagione/attivi, opzionale per leva | Impl | - |
| TODO | TASK-03 | Test integrazione multi-leva e no-financial | Nuovo `scripts/test-squad-panel.mjs`: coach mono-leva, coach multi-leva, isolamento cross-leva, assenza di colonne `payments` nella query, coach senza atleti attivi | Test | TASK-02 |
| TODO | TASK-04 | Pagina `SquadraAtleti.tsx` | Chip leva (visibili solo se l'allenatore ha più di una leva), card atleta con anagrafica + `MedicalStatusIndicator`, empty-state onesto se nessun atleto attivo | Impl | TASK-01, TASK-02 |
| TODO | TASK-05 | Route e voce di navigazione | Aggiungere `/squadra` in `App.tsx`, `NAV_ITEMS` e whitelist coach in `DashboardLayout.tsx` | Impl | TASK-04 |
| TODO | TASK-06 | Verifica manuale regressione `MedicalVisits.tsx` | Confronto visivo pre/post estrazione del componente condiviso, per escludere regressioni sulla pagina amministrativa esistente | Test | TASK-01 |
| TODO | TASK-07 | Verifica manuale end-to-end multi-ruolo | Percorso completo: coach mono-leva, coach multi-leva, coach senza atleti, president/director, su Supabase locale via browser | Test | TASK-05 |
| TODO | TASK-08 | Regressione completa | `npx supabase db reset` + `npm run test:integration` (in particolare `test-rls.mjs`) + `npx tsc -p tsconfig.app.json --noEmit` | Test | TASK-03, TASK-06, TASK-07 |

---

_Piano generato via Archetipo Planning — 2026-07-21_
