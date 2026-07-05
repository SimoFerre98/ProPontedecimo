# US-002: Policy RLS per tutti i ruoli — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-05

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** HIGH | **Story Points:** 5

**Story**
Come Presidente,
voglio che l'accesso ai dati sia regolato da policy Row Level Security basate sui ruoli (`president`, `director`, `coach`, `player`, `parent`),
così che ogni utente veda ed operi solo sui dati di propria competenza.

**Criteri di Accettazione**
- [ ] Il Presidente ha accesso CRUD completo su tutte le tabelle
- [ ] Il Dirigente può gestire anagrafiche, pagamenti e scadenze mediche ma non i ruoli dello staff
- [ ] L'Allenatore accede in CRUD solo agli atleti della propria squadra/leva e non vede i dettagli finanziari globali
- [ ] Giocatore e Genitore hanno accesso in sola lettura limitato rispettivamente al proprio profilo e ai figli associati
- [ ] Un tentativo di accesso a dati fuori competenza (via API diretta) restituisce un risultato vuoto o un errore, mai i dati
- [ ] Le policy sono versionate come migrazione (dipende da US-001 ✅)

---

## Soluzione Tecnica

La baseline (`20260704154518`) rivela che le RLS esistono già in parte (27 policy, funzione `get_user_role()` SECURITY DEFINER, enum con i 5 ruoli), ma con tre falle rispetto agli AC: escalation di privilegio su `profiles.role` (chiunque può auto-promuoversi via `profiles_update_self`; anche il Dirigente può cambiare ruoli), policy coach senza filtro squadra (il coach vede tutti gli atleti e **tutti i pagamenti**, inclusa la policy legacy "Staff can manage payments" che gli dà gestione completa), e ruolo `parent` privo di associazione e di policy. L'intervento è una migrazione correttiva incrementale sul flusso CLI di US-001 — non si riscrive l'impianto esistente, si chiudono i buchi.

- **Tabelle di associazione (nuove):** `coach_teams (profile_id, team_sector)` collega l'allenatore alle sue leve (match sul testo di `players.team_sector`; un coach può seguire più leve); `parent_players (parent_profile_id, player_id)` collega il genitore ai figli. Entrambe con RLS proprie: gestione solo admin (president/director), lettura della propria riga per l'interessato. La UI di gestione arriva con US-020/US-027 — qui le righe si popolano da pannello admin o SQL.
- **Funzioni helper SECURITY DEFINER** (stesso pattern di `get_user_role()`): `get_coach_sectors()` → array delle leve del coach; `get_parent_player_ids()` → array degli id dei figli. Tengono le policy leggibili ed evitano lookup RLS-ricorsivi sulle junction.
- **Anti-escalation ruoli:** trigger `BEFORE UPDATE` su `profiles` che blocca ogni modifica di `role` se `get_user_role() <> 'president'` (le policy non vedono OLD/NEW, serve un trigger). `profiles_update_admin` viene ristretta: il Dirigente può ancora aggiornare i dati anagrafici dei profili ma il cambio ruolo è appannaggio del solo Presidente (prerequisito per US-020).
- **Policy coach filtrate per squadra:** `players_select_coach` → `team_sector = ANY(get_coach_sectors())`; `attendance` → CRUD limitato ai player delle proprie leve; `medical_visits` → SELECT limitata alle proprie leve; **DROP** di `payments_select_coach` e della legacy `Staff can manage payments` (il coach non vede alcun dato finanziario, AC3).
- **Policy parent (nuove, sola lettura):** SELECT su `players`, `medical_visits`, `payments`, `attendance` filtrata su `player_id/id = ANY(get_parent_player_ids())`.
- **Hardening residuo:** lettura di `email_usage` ristretta allo staff (oggi `USING (true)` per tutti gli autenticati); revisione `WITH CHECK` sulle policy `FOR ALL` esistenti dove assente.
- **Interpretazione AC3 documentata:** "CRUD sugli atleti della propria squadra" = SELECT sull'anagrafica + CRUD sul registro presenze (coerente col PRD: registro presenze e convocazioni, visualizzazione tesseramento/scadenze); la modifica dell'anagrafica resta ad admin. Se in futuro il coach dovrà editare l'anagrafica, basterà una policy aggiuntiva.
- Tutto in **una migrazione** `db:new rls_roles_hardening` applicata con `db:push` (pooler `aws-1`, `--yes`), come da `docs/database.md`.

---

## Strategia di Test

Il cuore della verifica è una matrice di accesso eseguita via API con utenti reali per ciascun ruolo: la RLS si testa dal punto di vista del client, non guardando le policy.

- **Matrice di accesso per ruolo** (integration): script `scripts/test-rls.mjs` che crea via service key 5 utenti di prova (uno per ruolo, con coach assegnato a una leva e parent associato a un atleta), esegue SELECT/INSERT/UPDATE/DELETE sulle tabelle chiave e confronta con la matrice attesa; cleanup degli utenti a fine run
- **Anti-escalation** (integration): l'update del proprio `role` da parte di player/coach/director deve fallire; dal president deve riuscire
- **Isolamento coach** (integration): coach della leva A → 0 righe sugli atleti della leva B, 0 righe su `payments`
- **Isolamento parent** (integration): parent vede solo i figli associati; parent senza associazioni → 0 righe ovunque
- **Non-regressione staff** (smoke, manuale): login con l'utente admin reale → Dashboard, Atleti, Pagamenti, Calendario funzionano come prima
- **Versionamento** (CLI): `migration list` allineato locale/remoto dopo il push

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Migrazione: tabelle di associazione | Creare con `db:new` la migrazione con `coach_teams` e `parent_players` (PK composte, FK verso profiles/players, indici) e relative policy RLS (admin gestisce, interessato legge le proprie righe). | Impl | - |
| TODO | TASK-02 | Funzioni helper SECURITY DEFINER | Aggiungere `get_coach_sectors()` e `get_parent_player_ids()` con `search_path` fissato, stesso pattern di `get_user_role()`. | Impl | TASK-01 |
| TODO | TASK-03 | Trigger anti-escalation ruoli | Trigger BEFORE UPDATE su `profiles`: modifica di `role` consentita solo al president; ristrutturare `profiles_update_admin`/`profiles_update_self` di conseguenza. | Impl | TASK-02 |
| TODO | TASK-04 | Revisione policy coach | Sostituire le policy coach su `players`/`attendance`/`medical_visits` con versioni filtrate per `get_coach_sectors()`; DROP di `payments_select_coach` e della legacy "Staff can manage payments". | Impl | TASK-02 |
| TODO | TASK-05 | Policy parent | Nuove policy SELECT su `players`, `medical_visits`, `payments`, `attendance` filtrate su `get_parent_player_ids()`. | Impl | TASK-02 |
| TODO | TASK-06 | Hardening residuo | Lettura `email_usage` solo staff; aggiungere `WITH CHECK` dove mancante sulle policy `FOR ALL`. | Impl | TASK-04 |
| TODO | TASK-07 | Push migrazione al cloud | `db:push --yes` via pooler `aws-1` e verifica `migration list` allineata. | Impl | TASK-03, TASK-04, TASK-05, TASK-06 |
| TODO | TASK-08 | Script matrice di accesso | Scrivere `scripts/test-rls.mjs` (utenti di prova per i 5 ruoli via service key, asserzioni sulla matrice attesa, cleanup finale). | Test | TASK-07 |
| TODO | TASK-09 | Esecuzione matrice + smoke test | Eseguire lo script contro il cloud e verificare manualmente l'app con l'utente admin reale (Dashboard, Atleti, Pagamenti). | Test | TASK-08 |
| TODO | TASK-10 | Documentazione | Aggiornare `docs/database.md` con una sezione sul modello RLS (ruoli, associazioni, matrice di accesso sintetica). | Impl | TASK-07 |

---

_Piano generato via Archetipo Planning — 2026-07-05_
