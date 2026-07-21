# US-034: Feed notifiche color-coded — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-21

---

## User Story

**Epic:** EP-013 — Sistema di Notifiche Color-Coded
**Priorità:** LOW | **Story Points:** 5

**Story**
Come Genitore o Giocatore, voglio un feed di notifiche inviate da dirigenti e allenatori, classificate per colore in base alla gravità (Rosso = urgente, Ambra = promemoria, Bordeaux/Verde = comunicazioni), così che io colga subito l'importanza di ogni avviso, dalle variazioni d'orario dell'ultimo minuto alle news.

**Criteri di Accettazione**
- [ ] Dirigenti e allenatori possono creare notifiche scegliendo la gravità (Urgente/Promemoria/Comunicazione)
- [ ] Le notifiche sono mostrate ad atleti e genitori con il colore corrispondente alla gravità (Rosso/Ambra/Bordeaux-Verde)
- [ ] Il design è accattivante per i ragazzi ma non infantile, coerente col design system Premium Glass
- [ ] Gli allenatori possono notificare solo la propria leva; i dirigenti tutta la società

---

## Soluzione Tecnica

Il pattern architetturale più vicino in codebase è `call_ups`/`events` (US-032/US-030): una tabella scritta dallo staff con RLS che scopa per leva, letta dal pubblico opposto (atleti/genitori) tramite una funzione SECURITY DEFINER dedicata, dato che i ruoli `player`/`parent` non hanno visibilità diretta sui dati altrui necessari a calcolare lo scoping. Questa story introduce un concetto **volutamente distinto** dal sistema di "notifiche" già esistente in `notificationService.ts`/`useNotifications.ts` (la campanella nell'header staff): quello è un elenco derivato e calcolato al volo di scadenze/allarmi operativi, mai persistito, mai visto da atleti o genitori. Per non generare confusione concettuale — lo stesso tipo di errore di naming già segnalato altrove nel progetto — la nuova tabella e i relativi servizi si chiamano `announcements`, non `notifications`.

- Nuova tabella `announcements`: `id`, `created_by` (FK `profiles`), `severity` (nuovo enum `announcement_severity`: `urgent` / `reminder` / `communication`), `title`, `body`, `team_sector` (`text`, nullable — `NULL` = tutta la società), `created_at`. Nessuna colonna di stato/pubblicazione: è un feed append-only in sola creazione, senza il ciclo bozza→pubblicata dei call-up (fuori scope per una story Vision a grana grossa).
- RLS insert: `president`/`director` possono inserire con qualunque `team_sector` (incluso `NULL` per "tutta la società"); `coach` solo con `team_sector` in una delle proprie leve assegnate, verificato con una nuova funzione SECURITY DEFINER `is_coach_of_sector(text)` (variante di `is_coach_of_player` che confronta direttamente su `coach_teams`, utile perché qui si parte da un settore scelto in un dropdown e non da un `player_id`).
- RLS select staff: `president`/`director` vedono l'intero storico; `coach` vede le proprie leve più le comunicazioni "tutta la società" (stesso `is_coach_of_sector`).
- RLS select pubblico: nuova funzione SECURITY DEFINER `get_my_announcement_sectors()` che ritorna, per il `player`, il proprio `players.team_sector` (via `profile_id = auth.uid()`), e per il `parent`, i settori distinti dei figli con `parent_players.status = 'confirmed'` (riusa `get_parent_player_ids()`, **rispettando l'invariante documentato in CLAUDE.md**: mai includere righe `pending`). La policy `announcements_select_public` risulta `team_sector IS NULL OR team_sector = ANY(get_my_announcement_sectors())`.
- Frontend: due superfici nuove — pagina staff `/notifiche` (storico + form di composizione, aggiunta alla sidebar di `DashboardLayout`, visibile a `president`/`director`/`coach`) e pagina pubblica `/portal/notifiche` (feed sola lettura, card colorate per gravità, aggiunta sotto `PortalLayout` e linkata da una card su `PortalDashboard`). Il form di composizione riusa il pattern di selezione settori già presente in `SendEmailModal.tsx`: per il coach il selettore mostra solo le proprie leve (mai un input libero), come difesa in profondità coerente con la RLS lato DB.

---

## Strategia di Test

La strategia si concentra sul rischio principale della story: lo scoping per leva deve reggere sia in scrittura sia in lettura, a livello di database e non solo di UI, esattamente come richiesto dalla regola "grep prima di scrivere" del CLAUDE.md per qualunque nuova RLS.

- **Integrazione DB (nuovo `scripts/test-announcements-rls.mjs`):** coach che tenta l'INSERT su una leva non propria → deve fallire; coach che inserisce sulla propria leva → riesce; president/director che inseriscono con `team_sector = NULL` → riesce; player che legge un annuncio destinato a un'altra leva → non deve comparire nel resultset; parent con figlio `pending` (non `confirmed`) → gli annunci della leva di quel figlio non devono essere visibili (verifica esplicita dell'invariante `parent_players`).
- **Integrazione servizio (`announcementService`):** creazione con severità/target validi, lettura filtrata per ruolo corrente.
- **Componente/UI:** selettore leva limitato alle sole leve del coach loggato (niente opzioni fuori scope anche se il markup venisse manipolato); rendering del colore corretto per ciascuna delle tre severità nel feed pubblico; stato vuoto quando non ci sono annunci per la leva dell'utente.
- **Regressione:** rieseguire `npm run test:integration` per intero (non solo la nuova suite), dato che `coach_teams`/`get_parent_player_ids()` sono superfici condivise con US-002/US-017/US-027/US-032.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione tabella `announcements` | Creare enum `announcement_severity`, tabella `announcements` con indici su `team_sector` e `created_at`, RLS abilitata di base. | Impl | - |
| DONE | TASK-02 | Funzioni helper RLS | Creare `is_coach_of_sector(text)` e `get_my_announcement_sectors()` (SECURITY DEFINER), riusando `coach_teams` e `get_parent_player_ids()`. | Impl | TASK-01 |
| DONE | TASK-03 | Policy RLS insert/select | Policy insert per `president`/`director`/`coach` (scoping leva) e select per staff + pubblico (`announcements_select_public`). | Impl | TASK-02 |
| DONE | TASK-04 | Test RLS `test-announcements-rls.mjs` | Suite di integrazione: scrittura fuori leva bloccata, lettura cross-leva bloccata, invariante `parent_players.status='confirmed'` rispettata. | Test | TASK-03 |
| DONE | TASK-05 | `announcementService.ts` | Servizio frontend: `listAnnouncements()`, `createAnnouncement()`, tipizzato su `Database['public']['Tables']['announcements']`. | Impl | TASK-03 |
| DONE | TASK-06 | Pagina staff `/notifiche` | Nuova pagina `Notifiche.tsx`: storico (badge severità colorato, leva o "Tutta la società", data) + form di composizione con selettore severità e selettore leva scoping-aware (pattern `SendEmailModal.tsx`). Aggiunta a `App.tsx` e alla sidebar di `DashboardLayout.tsx` per `president`/`director`/`coach`. | Impl | TASK-05 |
| DONE | TASK-07 | Verifica selettore leva scoping-aware | Nessun framework di test componente nel progetto (solo integrazione contro Supabase reale, vedi TASK-04) — su decisione esplicita dell'utente, verificato manualmente via browser con login reale: il coach vede solo la propria leva bloccata, nessuna leva altrui selezionabile. | Test | TASK-06 |
| DONE | TASK-08 | Pagina pubblica `/portal/notifiche` | Nuova pagina feed sola lettura sotto `PortalLayout.tsx`: card colorate per gravità, ordine cronologico inverso, stato vuoto. Card di accesso aggiunta su `PortalDashboard.tsx`. | Impl | TASK-05 |
| DONE | TASK-09 | Verifica rendering feed pubblico | Stessa nota di TASK-07: verificato manualmente via browser il mapping colore↔severità per le tre gravità, il filtro e lo scoping RLS end-to-end (player/president). | Test | TASK-08 |
| DONE | TASK-10 | Regressione integrazione completa | `npx supabase db reset` + `npm run test:integration` per intero e `npx tsc --noEmit`, per escludere impatti su `coach_teams`/`parent_players`/RLS esistenti. | Test | TASK-04, TASK-07, TASK-09 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-034/`

_Piano generato via Archetipo Planning — 2026-07-21_
