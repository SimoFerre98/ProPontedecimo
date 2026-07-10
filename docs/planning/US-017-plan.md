# US-017: Registro presenze mobile-first — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-10
**Stato:** ✅ COMPLETATO — merge in `dev`/`main` dopo code review e verifica manuale multi-ruolo

---

## User Story

**Epic:** EP-006 — Registro Presenze
**Priorità:** HIGH | **Story Points:** 5

**Story**
Come Allenatore,
voglio segnare rapidamente da smartphone le presenze (Presente/Assente/Giustificato) degli atleti della mia squadra collegate alle date degli allenamenti,
così che la partecipazione sia tracciata direttamente dal campo senza fogli cartacei.

**Criteri di Accettazione**
- [ ] Il placeholder in `Attendance.tsx` è sostituito da una schermata funzionante ottimizzata per mobile
- [ ] L'allenatore vede solo gli atleti della propria squadra/leva (coerente con le RLS di US-002)
- [ ] Ogni atleta può essere marcato Presente, Assente o Giustificato per una data di allenamento
- [ ] Le presenze già registrate sono modificabili
- [ ] Le presenze registrate rispettano la stagione attiva selezionata

---

## Soluzione Tecnica

La tabella `attendance` esiste già dalla baseline con RLS coach già corretta da US-002 (`attendance_all_coach_team` filtra su `is_coach_of_player()`, lettura per `player`/`parent` già presente): il gap non è la sicurezza ma la modellazione (stato booleano invece di tri-stato, nessun vincolo di unicità) e tutto il resto è applicativo (oggi `Attendance.tsx` è un placeholder). Non serve nessuna nuova tabella né RPC: una migrazione correttiva sulla colonna di stato, un service layer sottile e una UI mobile-first sono sufficienti, appoggiandosi alla RLS esistente senza modificarla. Il registro resta deliberatamente disaccoppiato dal calendario eventi (`events`, introdotto dopo `attendance` e senza colonna di squadra/leva): l'allenatore seleziona una data con un date-picker invece di un evento specifico — risolve l'OPEN item lasciato nel backlog nel modo più semplice e coerente con lo schema esistente, senza aprire il fronte "associare gli eventi alle leve" fuori scope per una story da 5 punti.

- **Migrazione DB:** nuovo enum `attendance_status` ('present'/'absent'/'justified'), nuova colonna `status`, backfill da `present` (`true`→`present`, `false`/`null`→`absent`), `DROP COLUMN present`, vincolo `UNIQUE (player_id, session_date, type)` — necessario per rendere l'upsert "modifica se esiste" (AC4) atomico e senza righe duplicate. Nessuna modifica alle policy RLS: sono row-level, non toccano la colonna di stato.
- **`attendanceService.ts` (nuovo):** `getRosterForAttendance(seasonId, sector?)` interroga `players` filtrando su `season_id` (e opzionalmente `team_sector`) — la RLS filtra già il coach sulle proprie leve, quindi la query non deve reimplementare quel filtro; `getAttendanceForDate(playerIds, date)` legge le righe esistenti per quella data; `setAttendanceStatus(playerId, date, status, createdBy)` esegue upsert con `onConflict: 'player_id,session_date,type'` (type fissato a `'training'` per l'MVP).
- **Rispetto della stagione attiva/selezionata (AC5):** nessuna colonna `season_id` su `attendance` — non serve, perché il roster è già filtrato per `players.season_id = selectedSeasonId` (store Zustand `useAppStore`, stesso pattern di `Payments.tsx`/`MedicalVisits.tsx`) e ogni stagione ha righe `players` proprie. Cambiare stagione dall'header ricarica automaticamente roster e presenze via chiave React Query.
- **UI mobile-first:** selettore data (default oggi) + chip selettore leva (visibile solo se il roster contiene più di un `team_sector` — caso coach multi-leva o president/director) + lista verticale atleti con tre pulsanti a tocco singolo per stato, colore-codificati (verde/rosso/ambra) sullo stile "pill"/badge già usato in `MedicalVisits.tsx`, con mutation ottimistica via React Query. Nessun modal per singolo atleta, per restare nei "pochi tocchi" richiesti dalla demo della story.
- **Superficie condivisa:** `scripts/test-rls.mjs` (US-002) inserisce oggi righe in `attendance` con `present: true` — va aggiornato nello stesso intervento a `status: 'present'`, altrimenti la suite RLS si rompe silenziosamente e la regressione cross-story passerebbe inosservata.

---

## Strategia di Test

Il registro presenze tocca sia lo schema DB (superficie condivisa con US-002) sia una schermata interamente nuova senza framework di E2E nel progetto: la verifica combina integration test reali su Supabase locale e verifica manuale nel browser.

- **Migrazione e vincolo di unicità** (integration): dopo `supabase db reset`, verificare che l'upsert su `(player_id, session_date, type)` aggiorni la riga esistente invece di duplicarla
- **Tri-stato per leva** (integration, `scripts/test-attendance.mjs` nuovo): un coach segna Presente/Assente/Giustificato solo per gli atleti della propria leva; un tentativo su un atleta di un'altra leva viene bloccato dalla RLS esistente (nessuna regressione rispetto a US-002)
- **Modificabilità** (integration): la stessa combinazione player+data+type, se aggiornata due volte con stati diversi, produce una sola riga con l'ultimo stato scritto
- **Coerenza con la stagione selezionata** (integration): un atleta presente nella stagione N non compare nel roster/presenze quando è selezionata la stagione N+1
- **Non-regressione RLS** (integration): rieseguire `npm run test:integration` per intero dopo la migrazione, non solo il nuovo script, per escludere effetti sulle suite già verdi (`test-rls.mjs` in primis)
- **Smoke test manuale mobile** (manuale, browser a viewport ridotto): login come coach → schermata Presenze mostra solo la propria leva, toggle tri-stato reattivo, presenze già inserite pre-selezionate e modificabili; login come president/director → selettore leva visibile e funzionante su più squadre

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione: stato presenza tri-stato | Creare enum `attendance_status`, aggiungere colonna `status` con backfill da `present`, `DROP COLUMN present`, aggiungere vincolo `UNIQUE (player_id, session_date, type)`. | Impl | - |
| DONE | TASK-02 | Rigenerare i tipi TypeScript del DB | Aggiornare `src/types/database.ts` (tabella `attendance`) per riflettere colonna `status` ed enum, rimuovendo `present`. | Impl | TASK-01 |
| DONE | TASK-03 | Aggiornare `scripts/test-rls.mjs` | Sostituire gli insert di test che usano `present: true` con `status: 'present'`, per non rompere la suite RLS esistente (superficie condivisa US-002). | Test | TASK-01 |
| DONE | TASK-04 | `attendanceService`: roster e presenze | Nuovo `src/services/attendanceService.ts` con `getRosterForAttendance`, `getAttendanceForDate`, `setAttendanceStatus` (upsert `onConflict`). | Impl | TASK-02 |
| DONE | TASK-05 | Script di integrazione registro presenze | Nuovo `scripts/test-attendance.mjs`: tri-stato per leva, blocco cross-leva, upsert idempotente senza duplicati, coerenza con la stagione selezionata. | Test | TASK-04 |
| DONE | TASK-06 | Componenti UI mobile-first | Selettore data, chip selettore leva (visibile solo se >1 settore), riga atleta con toggle tri-stato a tocco singolo, contatore presenti/assenti/giustificati, skeleton/empty state. | Impl | TASK-04 |
| DONE | TASK-07 | Riscrittura `Attendance.tsx` | Sostituire il placeholder con la schermata funzionante: query roster+presenze via React Query, mutation ottimistica, rispetto della stagione selezionata dallo store. | Impl | TASK-06 |
| DONE | TASK-08 | Aggiornamento "Superfici condivise" in CLAUDE.md | Aggiungere la riga `attendance` (story US-002, US-017; cosa verificare: `test-rls.mjs`, vincolo di unicità) alla tabella delle superfici condivise. | Impl | TASK-01 |
| DONE | TASK-09 | Verifica manuale multi-ruolo | Reset Supabase locale, login come coach (propria leva) e come president/director (multi-settore); verificare presenze pre-esistenti modificabili e responsive su viewport mobile. | Test | TASK-07 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-017/`

_Piano generato via Archetipo Planning — 2026-07-10_

---

## Note di implementazione (deviazioni dal piano)

- **TASK-01:** il piano prevedeva di aggiungere il vincolo `UNIQUE (player_id, session_date, type)`; la migrazione correttamente non lo fa perché esisteva già dalla baseline (`attendance_player_id_session_date_type_key`) — non individuato durante la sessione di planning.
- **Code review:** `npm run lint` ha rilevato una variabile `filteredPlayerIds` calcolata ma non utilizzata in `Attendance.tsx` (la query presenze usa correttamente `completeRoster` per non perdere i conteggi al cambio di leva) — rimossa in review (commit `9d0f9a1`).
- **Verifica manuale:** eseguita con dati di prova ad hoc (stagione, coach multi-leva, 5 atleti su 2 leve, una presenza pre-esistente) su Supabase locale; confermati filtro per leva, tocco tri-stato, editabilità senza duplicazione (verificata anche via query diretta sulla tabella) e conteggi coerenti.
