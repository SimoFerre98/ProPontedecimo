# US-014: Feed iCal personalizzato per la sincronizzazione esterna — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-09

---

## User Story

**Epic:** EP-004 — Calendario Eventi & Sincronizzazione
**Priorità:** MEDIUM | **Story Points:** 5

**Story**
Come Genitore,
voglio iscrivermi a un link iCal (.ics) personale che espone gli eventi societari di mio interesse,
così che allenamenti e partite compaiano automaticamente e in tempo reale su Google Calendar, Apple Calendar o Outlook.

**Criteri di Accettazione**
- [ ] Un endpoint (Supabase Edge Function) espone un feed `.ics` dinamico e valido per i principali client (Google, Apple, Outlook)
- [ ] Il link è personalizzato per utente tramite token non indovinabile e mostra solo gli eventi di sua competenza
- [ ] Gli eventi di tipo Partita includono l'orario di ritrovo nel dettaglio dell'evento esportato (dipende da US-013)
- [ ] Le modifiche agli eventi si riflettono nel feed al successivo refresh del client
- [ ] L'utente può rigenerare il proprio link, invalidando il precedente

> ℹ️ **Nota di scoping:** la tabella `events` introdotta da US-013 non ha, per scelta deliberata, alcuna colonna di scoping per leva/ruolo — tutti gli eventi calcistici sono club-wide. Il feed espone quindi l'intero calendario societario a chiunque possieda il token valido: "personalizzato" si riferisce al link privato e revocabile per singolo utente (AC2, AC5), non a un filtro sui contenuti in base al ruolo. Se in futuro `events` introdurrà uno scoping per leva (riusando `get_coach_sectors()`/`get_parent_player_ids()` già esistenti), andrà propagato anche qui. Il feed espone solo i record di `events`: task interni (`staff_tasks`) e scadenze visite mediche non vi compaiono, per non esporre dati sensibili o di lavoro interno tramite un link non autenticato via sessione.

---

## Soluzione Tecnica

Il feed richiede un endpoint raggiungibile da client calendario esterni senza sessione Supabase (Google/Apple/Outlook non possono inviare un JWT): la soluzione introduce quindi un token opaco per-utente memorizzato su `profiles`, una Edge Function pubblica che lo risolve con la service role, e un serializzatore iCal minimale che riusa il doppio orario introdotto da US-013.

- Migrazione `supabase/migrations/<ts>_add_ics_token.sql`: colonna `profiles.ics_token uuid UNIQUE` (nullable, nessun default: generato solo su richiesta esplicita) e RPC `regenerate_ics_token() RETURNS uuid` (SECURITY INVOKER, `UPDATE profiles SET ics_token = gen_random_uuid() WHERE id = auth.uid()`) — riusa la policy `profiles_update_self` già esistente, nessuna nuova RLS necessaria; rigenerare il token *è* l'operazione di revoca del precedente (AC5), senza bisogno di una tabella di storicizzazione
- Nuovo `supabase/functions/_shared/ics.ts`: serializzatore RFC 5545 minimale e senza dipendenze esterne (escape di virgole/punto e virgola/newline nei campi TEXT, folding delle righe a 75 caratteri, un `VEVENT` per riga di `events`) — per `home_match`/`away_match` usa `meetup_time` come `DTSTART` (l'orario a cui "presentarsi", coerente con l'intento della story) e riporta entrambi gli orari (ritrovo + inizio gara) nella `DESCRIPTION`, per gli altri tipi usa `start_date`; `DTEND` è calcolato con una durata fissa per tipo (2h per le partite, 1h30 per l'allenamento, 1h per riunione/generico), dato che lo schema di US-013 non registra un orario di fine
- Nuova Edge Function `supabase/functions/ics-feed/index.ts`: riceve `GET ?token=<uuid>`, usa `SUPABASE_SERVICE_ROLE_KEY` per risolvere `profiles` by `ics_token` (bypassando la RLS che altrimenti bloccherebbe una richiesta anonima) e recuperare tutti gli `events`, poi risponde con `Content-Type: text/calendar; charset=utf-8` e `Content-Disposition: attachment`; token assente/non trovato → `404` testuale generico. In `supabase/config.toml` si aggiunge `[functions.ics-feed]` con `verify_jwt = false`, perché questa è l'unica funzione del progetto pensata per essere chiamata senza JWT Supabase — le altre (`send-email`, `medical-reminders`) restano invariate
- Nessuna cache lato server: la Edge Function interroga `events` ad ogni richiesta, quindi le modifiche sono visibili al successivo poll del client calendario (AC4) — il refresh interval (tipicamente orario) è deciso dal client esterno, non controllabile da noi
- Nuovo `src/services/icsFeedService.ts`: `getIcsToken()` (select su `profiles`), `regenerateIcsToken()` (chiama la RPC), `buildIcsUrl(token)` (compone l'URL pubblico da `import.meta.env.VITE_SUPABASE_URL`) — stesso livello di astrazione degli altri `*Service.ts` del progetto
- `src/components/modals/ProfileModal.tsx`: nuova sezione "Sincronizza Calendario" nel corpo del modale (pulsante genera/rigenera link, campo di sola lettura con il link e azione "copia"), che riusa gli stessi pattern visivi (pill, glass-card, badge di stato) già presenti nel modale — essendo `ProfileModal` già condiviso tra `DashboardLayout` e `PortalLayout`, la funzionalità è automaticamente disponibile a tutti i ruoli senza logica di visibilità aggiuntiva, coerente con l'assenza di scoping sul contenuto del feed

---

## Strategia di Test

La superficie critica è la Edge Function pubblica (nessuna sessione, autenticazione solo via token) e la corretta rigenerazione/invalidazione del token; entrambe sono verificate con test di integrazione reali contro Supabase locale, non con mock.

- Test di integrazione (nuovo `scripts/test-ics-feed.mjs`, contro Supabase locale + Edge Runtime locale su `http://127.0.0.1:54321/functions/v1/ics-feed`): crea un profilo di test con eventi `home_match` e `training` (riusando lo schema di `test-events.mjs`), chiama la RPC `regenerate_ics_token()`, esegue una `GET` diretta con il token e verifica che la risposta sia un `VCALENDAR` valido con un `VEVENT` per evento, `Content-Type: text/calendar`, e che la `DESCRIPTION` della partita contenga sia l'orario di ritrovo che quello di inizio gara (AC1, AC3)
- Test negativo: `GET` senza `token` o con un token inesistente → `404`; dopo una seconda chiamata a `regenerate_ics_token()`, il token precedente torna `404` mentre quello nuovo funziona (AC5)
- Test di non-regressione: verifica che `staff_tasks` e le scadenze di `medical_visits` non compaiano nel feed anche se presenti nel periodo, e che il resto della suite (`test-rls.mjs`, `test-events.mjs`) resti verde — la nuova Edge Function non modifica alcuna RLS esistente
- Verifica visiva manuale (via preview): apertura di "Il Mio Profilo", generazione del link, copia negli appunti, apertura del link in una nuova tab del browser per controllare che venga offerto un file `.ics` ben formato con gli eventi creati in US-013; rigenerazione del link e conferma che il vecchio smette di funzionare

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione `profiles.ics_token` + RPC `regenerate_ics_token()` | Nuovo file in `supabase/migrations/`: colonna token univoca nullable, RPC che la rigenera per l'utente corrente riusando `profiles_update_self` | Impl | - |
| DONE | TASK-02 | Crea `supabase/functions/_shared/ics.ts` | Serializzatore RFC 5545 puro: escape testo, folding righe, costruzione VEVENT con DTSTART/DTEND/DESCRIPTION coerenti col doppio orario di US-013 | Impl | - |
| DONE | TASK-03 | Crea Edge Function `supabase/functions/ics-feed/index.ts` | Risoluzione token via service role, fetch `events`, risposta `text/calendar`; aggiunta `[functions.ics-feed]` con `verify_jwt = false` in `config.toml` | Impl | TASK-01, TASK-02 |
| DONE | TASK-04 | Test integrazione `scripts/test-ics-feed.mjs` | Casi positivi (VEVENT count, doppio orario in DESCRIPTION), negativi (token assente/invalido → 404), rigenerazione che invalida il precedente | Test | TASK-03 |
| DONE | TASK-05 | Crea `src/services/icsFeedService.ts` | `getIcsToken()`, `regenerateIcsToken()`, `buildIcsUrl()` | Impl | TASK-01 |
| DONE | TASK-06 | Sezione "Sincronizza Calendario" in `ProfileModal.tsx` | Genera/rigenera link, copia negli appunti, stati di caricamento/errore | Impl | TASK-05 |
| DONE | TASK-07 | Verifica manuale UI (genera, copia, fetch diretto, rigenera) | Avviare il dev server: generare il link dal profilo, scaricare il `.ics` e validarne il contenuto, rigenerare e confermare l'invalidazione del vecchio link | Test | TASK-04, TASK-06 |

---

_Piano generato via Archetipo Planning — 2026-07-09_
