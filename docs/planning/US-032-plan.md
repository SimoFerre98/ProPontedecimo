# US-032: Gestione convocazioni — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-17

---

## User Story

**Epic:** EP-012 — Portale Allenatore
**Priorità:** LOW | **Story Points:** 5

**Story**
Come Allenatore,
voglio selezionare i convocati della mia leva per la partita del weekend e notificarli sul portale giocatori,
così che la squadra sia informata in anticipo e in modo tracciato.

**Criteri di Accettazione**
- [ ] L'allenatore seleziona i convocati tra gli atleti della propria leva per un evento di tipo Partita (dipende da US-013)
- [ ] La pubblicazione rende la convocazione visibile ai giocatori sul loro portale
- [ ] La lista convocati è modificabile fino all'orario di ritrovo, con stato aggiornato per i giocatori
- [ ] L'allenatore non può convocare atleti di altre leve
- [ ] L'allenatore può ritirare la pubblicazione (tornare in bozza) fino all'orario di ritrovo, per correggere un errore

> **Nota di sequenziamento (Emanuele):** questa story era originariamente la seconda dell'ordine di lavorazione (dopo US-030, "Visualizzazione convocazioni"), ma US-030 dipende esplicitamente da questa: senza una tabella di convocazioni e senza le colonne che descrivono una partita (avversario, leva, orario di ritrovo/inizio) non c'è nulla da visualizzare lato giocatore. US-032 è quindi la story che possiede lo schema dati; si è deciso con l'utente di pianificarla per prima. US-030 e US-031 (calendario/classifica leva) riusano lo stesso schema esteso di `events` senza doverlo ritoccare.
>
> Assumption non bloccanti: nessuna policy per i genitori (`*_select_parent`) è richiesta da questa story — a differenza di `attendance`/`payments`/`medical_visits`, gli AC parlano solo di allenatore e giocatore. È annotato come possibile estensione futura, non implementato qui.
>
> **Aggiornamento (2026-07-17, su richiesta dell'utente):** l'allenatore può anche **ritirare la pubblicazione** (tornare in bozza), non solo correggere i singoli nominativi già pubblicati — pensato per il caso "mi sono accorto di un errore grosso e voglio ricomporre la lista senza che resti visibile nel frattempo". Anche il ritiro resta possibile solo fino all'orario di ritrovo, in coerenza con AC3.
>
> **Code review (Cesare, 2026-07-17):** trovato e corretto un problema critico — il campo "Leva" nel form evento era testo libero, con rischio di mismatch silenzioso rispetto a `players.team_sector` (una partita con leva scritta in modo leggermente diverso sarebbe sparita da qualunque selettore, incluso quello di president/director, senza alcun errore). Sostituito con un `<select>` alimentato da `athleteService.getUniqueSectors()`, stesso pattern già in uso in `AddAthleteModal.tsx`. Applicati anche 4 miglioramenti minori: rigenerazione tipi TS (mancava `is_call_up_published` dopo il fix RLS), rimozione della funzione duplicata `getRosterForSector` in `callUpService.ts` (ora si riusa `attendanceService.getRosterForAttendance`), nuovo test automatico per il ritiro pubblicazione (AC5) in `scripts/test-call-ups.mjs`, `REVOKE`/`GRANT EXECUTE` espliciti su `is_call_up_published()` (pattern già in uso per `create_season_from_wizard`/`create_payment_plan`).

---

## Soluzione Tecnica

La soluzione riusa il più possibile schema e pattern UI già esistenti per `attendance` (US-017), che è lo stesso problema — stato per-atleta legato a una data/evento, scoping per leva dell'allenatore — con una differenza sola: qui lo stato è binario (convocato/non convocato) e c'è un passaggio esplicito di pubblicazione.

- **Migrazione `events`**: tre nuove colonne nullable — `opponent text`, `team_sector text`, `call_up_published_at timestamptz`. Nessun vincolo NOT NULL/CHECK: `team_sector` e `opponent` sono obbligatori solo nel flusso applicativo "crea partita per la convocazione", validato in UI e non nel DB condiviso (coerente con la regola KISS di CLAUDE.md sui vincoli globali su tabelle scritte da più story). Queste colonne sono pensate esplicitamente per essere riusate da US-030 (visualizzazione) e US-031 (calendario/classifica leva) senza una seconda migrazione su `events`.
- **Nuova tabella `call_ups`**: `id, event_id → events(id) ON DELETE CASCADE, player_id → players(id) ON DELETE CASCADE, created_by, created_at`, vincolo di unicità `(event_id, player_id)`. Niente colonna di stato: la presenza della riga *è* lo stato "convocato" — "non convocato" è l'assenza della riga, esattamente come le presenze "da segnare" in `attendance`. È lo schema minimo che soddisfa gli AC senza un enum di stato inutile.
- **RLS a policy separate per comando** (non una `FOR ALL` unica), perché il vincolo temporale si applica solo a scrittura/cancellazione, non a lettura:
  - `call_ups_select_coach` (SELECT, senza limite di tempo — l'allenatore deve poter rivedere convocazioni passate)
  - `call_ups_insert_coach` / `call_ups_delete_coach` (richiedono `is_coach_of_player(player_id)` — funzione già esistente da US-017 — **e** `meetup_time > now()` sull'evento collegato): questo realizza sia AC4 (isolamento per leva) sia il blocco post-ritrovo di AC3, a livello database e non solo di UI
  - `call_ups_all_admin` (president/director, nessuna restrizione — stesso pattern di `events_all_admin`)
  - `call_ups_select_player` (per l'AC di US-030, non di questa story, ma appartiene alla stessa migrazione: il giocatore vede solo le proprie righe, e solo se `events.call_up_published_at IS NOT NULL` — verificato tramite la funzione `is_call_up_published(event_id)` SECURITY DEFINER, non con una sottoquery diretta su `events`: il ruolo `player` non ha (né deve avere, per questa story) alcuna policy SELECT su `events`, quindi una sottoquery diretta risulterebbe sempre falsa — bug trovato e corretto durante i test di integrazione, TASK-02)
- **Service layer** `callUpService.ts`: `getUpcomingMatchEvents(sector?)`, `getRosterForEvent(eventId)` (riusa lo stesso shape di `getRosterForAttendance`), `getCallUpsForEvent(eventId)`, `toggleCallUp(eventId, playerId, isCalledUp)` (insert o delete della riga, non un upsert con stato), `publishCallUps(eventId)` / `unpublishCallUps(eventId)` (update di `call_up_published_at` a `now()`/`NULL` — il ritiro non cancella le righe `call_ups` già inserite, nasconde solo la lista ai giocatori finché non si ripubblica).
- **Frontend**: nuova pagina `Convocazioni.tsx` su rotta `/convocazioni`, nello stesso branch Staff di `/atleti` e `/presenze` (`RoleGuard` invariato: president, director, coach), aggiunta a `NAV_ITEMS` e al filtro di visibilità del coach in `DashboardLayout.tsx`. Il pattern UI ricalca `Attendance.tsx`: chip leva, selettore partita al posto dello stepper data, righe atleta con toggle invece del tri-state, mutazione ottimistica con la stessa animazione "just-set". Il form di creazione/modifica evento (dentro `CalendarModal.tsx` o dove oggi si crea un evento) va esteso con i campi avversario e leva quando `event_type` è `home_match`/`away_match`, altrimenti le nuove colonne restano sempre vuote e non c'è nulla da convocare.

**Nota (Ugo):** la policy `events_all_coach` esistente non è oggi scoperta per leva — qualunque allenatore può modificare qualunque evento. È un gap preesistente (da US-013), non introdotto da questa story: non lo tocchiamo qui. L'AC4 ("non può convocare atleti di altre leve") resta comunque garantito perché il controllo è su `is_coach_of_player`, cioè sull'atleta, non sull'evento. La UI filtra comunque le partite mostrate alla sola leva dell'allenatore.

Lo stesso gap si applica a `publishCallUps`/`unpublishCallUps`, che scrivono su `events.call_up_published_at`: il vincolo "solo fino al ritrovo" per pubblicare/ritirare è imposto in UI (bottone disabilitato dopo `meetup_time`), non a livello RLS — a differenza dell'inserimento/rimozione dei singoli convocati in `call_ups`, che è vincolato anche a livello database. Non aggiungiamo un vincolo temporale a `events_all_coach` per restare minimali su una tabella condivisa da più story; il rischio è basso perché la peggior conseguenza è una lista già esistente che appare/scompare, non un dato falsificato.

---

## Strategia di Test

Il punto critico non è la UI ma il doppio vincolo RLS (leva + tempo): un allenatore non deve poter scrivere una riga `call_ups` fuori dalla propria leva né dopo l'orario di ritrovo, e un giocatore non deve mai vedere una convocazione non ancora pubblicata o di un altro atleta.

- **Integrazione (nuovo `scripts/test-call-ups.mjs`)**: un allenatore convoca un atleta della propria leva su un evento futuro con `meetup_time` non ancora passato → riuscito; lo stesso allenatore tenta di convocare un atleta di un'altra leva → bloccato dalla RLS (`is_coach_of_player`); un allenatore tenta insert/delete su un evento con `meetup_time` nel passato → bloccato; il giocatore convocato non vede la riga finché `call_up_published_at` è `NULL`; dopo la pubblicazione la vede; un secondo giocatore (non convocato, stessa leva) non vede la riga del primo; president/director operano senza restrizioni indipendentemente dalla leva o dal ritrovo.
- **Regressione (obbligatoria pre-merge, `events` è superficie condivisa da US-012/US-013)**: `npx supabase db reset` seguito da `npm run test:integration` — attenzione in particolare a `test-rls.mjs` e a qualunque test esistente sul calendario, per verificare che le tre colonne aggiunte a `events` non rompano creazione/validazione degli eventi esistenti.
- **Type-check**: `npx tsc --noEmit` dopo la rigenerazione dei tipi (`call_ups`, colonne aggiunte a `events`).
- **Manuale (UI, per ruolo)**: login come `coach` → crea/seleziona una partita della propria leva con avversario e orario di ritrovo, convoca alcuni atleti (toggle), verifica che la lista resti privata; pubblica; verifica che i toggle restino attivi e le modifiche si riflettano subito; ritira la pubblicazione e verifica che la lista torni invisibile ai giocatori senza perdere le righe già convocate; ripubblica e verifica che riappaia con lo stato corretto; login come `president`/`director` → verifica di poter operare su qualunque leva; verifica manuale che, superato l'orario di ritrovo, i toggle e il bottone di pubblicazione/ritiro risultino disabilitati in UI.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione: colonne `events` e tabella `call_ups` | Aggiunta `opponent`, `team_sector`, `call_up_published_at` a `events`; nuova tabella `call_ups` con vincolo di unicità `(event_id, player_id)`; RLS separate per comando (select/insert/delete coach, all admin, select player) riusando `is_coach_of_player` | Impl | - |
| DONE | TASK-02 | Test integrazione RLS | Nuovo `scripts/test-call-ups.mjs`: isolamento per leva, blocco post-ritrovo, visibilità giocatore solo dopo pubblicazione, accesso libero per president/director. Ha intercettato e portato alla correzione di un bug reale (`call_ups_select_player` non funzionava perché il ruolo player non ha policy SELECT su `events`; fix: funzione `is_call_up_published()` SECURITY DEFINER) | Test | TASK-01 |
| DONE | TASK-03 | Rigenerazione tipi TypeScript | Rigenerare `src/types/database.ts` (tabella `call_ups`, colonne aggiunte a `events`) | Impl | TASK-01 |
| DONE | TASK-04 | Service layer `callUpService.ts` | `getUpcomingMatchEvents`, `getRosterForSector`, `getCallUpsForEvent`, `toggleCallUp`, `publishCallUps`, `unpublishCallUps` | Impl | TASK-03 |
| DONE | TASK-05 | Estensione form evento partita | Aggiungere campi avversario e leva al modale di creazione/modifica evento quando `event_type` è `home_match`/`away_match` | Impl | TASK-03 |
| DONE | TASK-06 | Pagina `Convocazioni.tsx` | Selettore partita (scoping leva per il coach), lista atleti con toggle convocato/non convocato in stile `Attendance.tsx`, badge stato bozza/pubblicato, bottone Pubblica/Ritira pubblicazione, disabilitazione post-ritrovo | Impl | TASK-04 |
| DONE | TASK-07 | Route e voce di navigazione | Aggiungere `/convocazioni` in `App.tsx`, `NAV_ITEMS` e filtro di visibilità coach in `DashboardLayout.tsx` | Impl | TASK-06 |
| DONE | TASK-08 | Aggiornamento CLAUDE.md — Superfici condivise | Aggiungere `events` (nuove colonne) e `call_ups` alla tabella, indicando che US-030/US-031 dipendono da queste colonne e che nessuna policy `_select_parent` esiste ancora su `call_ups` | Impl | TASK-01 |
| DONE | TASK-09 | Verifica manuale end-to-end multi-ruolo | Coach crea partita → convoca → pubblica → modifica dopo pubblicazione → ritira pubblicazione (torna in bozza senza perdere i convocati) → verificato su Supabase locale via browser. Ha trovato un bug: lo stato "Bloccata" mostrava "Visibile ai giocatori"/"Ritira pubblicazione" anche per eventi mai pubblicati, prima che il ritrovo passasse — corretto (ora mostra un avviso onesto "i giocatori non l'hanno vista"). President verificato senza restrizioni di accesso alla pagina | Test | TASK-06, TASK-07 |
| DONE | TASK-10 | Regressione completa | `npx supabase db reset` + `npm run test:integration` (in particolare `test-rls.mjs` e i test calendario) + `npx tsc --noEmit` — tutte le 16 suite passano, `tsc` pulito | Test | TASK-02, TASK-06, TASK-07 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-032/`

_Piano generato via Archetipo Planning — 2026-07-17_
