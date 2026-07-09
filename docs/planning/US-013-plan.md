# US-013: Tipologie evento calcistiche con doppio orario — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-09

---

## User Story

**Epic:** EP-004 — Calendario Eventi & Sincronizzazione
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come Allenatore,
voglio creare eventi tipizzati (Allenamento, Partita in Casa, Trasferta, Riunione) dove le partite hanno sia "Orario di Ritrovo" che "Orario di Inizio Gara",
così che squadra e famiglie sappiano con precisione quando presentarsi e quando si gioca.

**Criteri di Accettazione**
- [ ] L'evento supporta le tipologie: Allenamento, Partita in Casa, Trasferta, Riunione, Evento generico
- [ ] Gli eventi di tipo Partita richiedono e mostrano sia l'Orario di Ritrovo che l'Orario di Inizio Gara
- [ ] Le tipologie sono distinguibili visivamente nel calendario (colore/icona coerenti col design system)
- [ ] Un evento non-Partita non mostra campi orario doppi superflui

> ℹ️ **Nota di scoping:** oggi il calendario (`calendarService.ts`) aggrega solo `staff_tasks` (to-do interni con workflow `created/ready/done/archive`, gestiti dalla Kanban di `StaffTasks.tsx`) e `players.medical_expiry`. Nessuna delle due è un "evento calcistico": forzare tipo/doppio-orario dentro `staff_tasks` inquinerebbe un modello già usato altrove. Si introduce una **tabella dedicata `events`**, coerente con come US-014 (feed iCal, dipendente da questa story) già tratta gli "eventi di tipo Partita" come concetto di prima classe. Deliberatamente **non** si aggiunge uno scoping per `team_sector`: nessun criterio di accettazione lo richiede, e introdurlo ora forzerebbe anche "Riunione"/"Evento generico" club-wide ad avere una leva assegnata. I permessi seguono il pattern già usato per `attendance` (CRUD pieno per president/director/coach, senza restrizione per riga) — se in futuro servirà limitare un coach alle proprie leve, sarà una story a sé che potrà riusare `get_coach_sectors()` già esistente.

---

## Soluzione Tecnica

Nuova tabella `events` con RLS dedicata, nuovo `eventService.ts` e `EventModal.tsx` che clonano i pattern già consolidati (`staffService.ts`/`TaskModal.tsx`), e integrazione nel `calendarService.ts` esistente come terza fonte di eventi accanto a task e scadenze mediche — riusando gli helper timezone-corretti `combineLocalDateTime`/`splitLocalDateTime` introdotti in US-012 invece di reimplementare la logica data/ora.

- Migrazione: `CREATE TYPE event_type AS ENUM ('training','home_match','away_match','meeting','generic')` e tabella `events` (`id`, `title`, `description`, `event_type`, `start_date timestamptz` — orario di inizio gara/allenamento/riunione, `meetup_time timestamptz NULL` — orario di ritrovo, `created_by`, `created_at`, `updated_at`), con vincolo `CHECK (event_type NOT IN ('home_match','away_match') OR meetup_time IS NOT NULL)` per applicare l'AC2 anche lato server, non solo nel form
- RLS su `events`: policy `events_all_admin` (president/director) ed `events_all_coach` (coach), entrambe `USING` senza restrizione di riga — stesso pattern di `attendance_all_admin`/`attendance_cru_coach` — nessun accesso per player/parent (non usano `DashboardLayout`)
- Nuovo `src/services/eventService.ts`: `getEvents()`, `createEvent()`, `updateEvent()`, `deleteEvent()`, stesso scheletro di `staffService.ts`
- Nuovo `src/lib/eventTypes.ts`: mappa unica `event_type → { label, icon, color }` (es. training=verde/Dumbbell, home_match=blu/Home, away_match=ambra/MapPin, meeting=viola/Users, generic=grigio/CalendarIcon), riusata sia da `EventModal.tsx` (selettore tipo) sia da `CalendarModal.tsx` (badge giorno) per garantire l'AC3 senza duplicare la mappatura in due punti
- Nuovo `src/components/modals/EventModal.tsx`, calco di `TaskModal.tsx`: selettore tipo evento, campo "Orario di Inizio Gara" (label dinamica: "Orario" per i tipi non-Partita), campo "Orario di Ritrovo" **renderizzato solo se `event_type` è `home_match`/`away_match`** (soddisfa l'AC4), usa `combineLocalDateTime`/`splitLocalDateTime` per submit e precompilamento in modifica
- `calendarService.ts`: nuova terza variante nell'union `CalendarEvent` (`type: 'event'; originalData: FootballEvent`), fetch di `eventService.getEvents()` in parallelo a task/visite mediche, `displayTitle` che per le Partite mostra entrambi gli orari (`"08:30 → 10:00 - Trasferta: <titolo>"`), per gli altri tipi solo l'orario singolo
- `CalendarModal.tsx`: aggiunta di un pulsante "Nuovo Evento" che apre `EventModal`, badge del giorno con icona/colore da `eventTypes.ts`, click su un evento esistente apre `EventModal` in modifica (stesso schema di `handleEventClick` già presente per i task)

---

## Strategia di Test

La logica critica (vincolo doppio-orario, RLS, rendering condizionale) è verificata sia a livello database sia di comportamento UI.

- Test di integrazione (nuovo `scripts/test-events.mjs`, contro Supabase locale): insert di un evento `home_match`/`away_match` senza `meetup_time` deve fallire per il CHECK constraint; insert con `meetup_time` valorizzato deve riuscire; insert di `training`/`meeting`/`generic` senza `meetup_time` deve riuscire (nessun vincolo superfluo)
- Test di integrazione RLS: president/director/coach possono creare/leggere/modificare/eliminare eventi; un utente `player`/`parent` (se mai avesse una sessione con ruolo diverso) non ha policy che lo autorizzi — verifica negativa
- Verifica visiva manuale (via preview): creare un "Allenamento" e confermare che il form non mostra il campo Ritrovo; creare una "Trasferta" con ritrovo 08:30 e inizio gara 10:00 e confermare che il calendario mostra entrambi gli orari nel giorno corretto; confermare che le 5 tipologie hanno icona/colore distinti nel badge calendario

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione tabella `events` + enum + CHECK + RLS | Nuovo file in `supabase/migrations/`: `event_type` enum, tabella `events`, vincolo CHECK sul doppio orario, policy `events_all_admin`/`events_all_coach` | Impl | - |
| DONE | TASK-02 | Test integrazione vincolo CHECK e RLS | `scripts/test-events.mjs`: insert validi/invalidi per il vincolo doppio-orario, matrice di accesso RLS per i 3 ruoli autorizzati | Test | TASK-01 |
| DONE | TASK-03 | Crea `src/services/eventService.ts` | CRUD su `events`, stesso pattern di `staffService.ts` | Impl | TASK-01 |
| DONE | TASK-04 | Crea `src/lib/eventTypes.ts` | Mappa `event_type → {label, icon, color}` condivisa tra form e calendario | Impl | - |
| DONE | TASK-05 | Crea `src/components/modals/EventModal.tsx` | Form nuovo/modifica evento: selettore tipo, orario unico o doppio condizionale, uso di `combineLocalDateTime`/`splitLocalDateTime` | Impl | TASK-03, TASK-04 |
| DONE | TASK-06 | Estendi `calendarService.ts` con la terza fonte `events` | Merge di `eventService.getEvents()` nell'union `CalendarEvent`, `displayTitle` con doppio orario per le Partite | Impl | TASK-03, TASK-04 |
| DONE | TASK-07 | Integra `EventModal` in `CalendarModal.tsx` | Pulsante "Nuovo Evento", click su evento esistente apre la modifica, badge giorno con icona/colore da `eventTypes.ts` | Impl | TASK-05, TASK-06 |
| DONE | TASK-08 | Verifica manuale UI (tipi, doppio orario, distinzione visiva) | Avviare il dev server: creare un evento per ciascuna delle 5 tipologie, verificare campi condizionali e badge distinti nel calendario | Test | TASK-07 |

---

_Piano generato via Archetipo Planning — 2026-07-09_
