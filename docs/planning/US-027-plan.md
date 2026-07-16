# US-027: Associazione figli a carico — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-16

---

## User Story

**Epic:** EP-010 — Portale Genitore & Pagamenti Online
**Priorità:** LOW | **Story Points:** 3

**Story**
Come Genitore,
voglio collegare al mio account uno o più atleti come figli (in autonomia o tramite la dirigenza),
così che il portale mi mostri le informazioni di tutti i miei figli tesserati.

**Criteri di Accettazione**
- [ ] Il genitore può richiedere/inserire l'associazione a uno o più atleti come figli
- [ ] Gli amministratori possono creare, confermare e rimuovere le associazioni genitore-figlio
- [ ] Il genitore vede solo i dati dei figli effettivamente associati (RLS di US-002)

> **Nota di scope (Emanuele):** US-002 ha già costruito la tabella `parent_players` (parent_profile_id, player_id) e quattro policy RLS (`players_select_parent`, `medical_select_parent`, `payments_select_parent`, `attendance_select_parent`) che dipendono tutte dalla funzione `get_parent_player_ids()`. L'AC3 è quindi **già soddisfatto** a livello database: il gap reale di questa story è tutto in AC1 (oggi nessuna policy INSERT permette al genitore di scrivere su `parent_players`, e senza SELECT su `players` un genitore non può nemmeno cercare il proprio figlio) e AC2 (nessuna UI amministrativa esiste per gestire queste associazioni — l'unico modo oggi è un intervento manuale sul database). Assumption non bloccanti, annotate qui invece di interrompere la pianificazione: non esiste uno stato "rifiutato" distinto dalla rimozione (l'admin rimuove una richiesta pending esattamente come rimuove un'associazione confermata); il genitore non può cancellare una propria richiesta pending (può solo attendere la decisione dell'admin); la ricerca atleta durante la richiesta è libera per nome/cognome (confermato con l'utente), mostrando solo nome, cognome e leva — mai dati sensibili — perché la richiesta resta comunque `pending` fino a conferma admin.

---

## Soluzione Tecnica

La tabella `parent_players` e le policy RLS derivate da `get_parent_player_ids()` esistono già da US-002: l'accesso ai dati dei figli è già isolato per costruzione. Il piano introduce uno stato `pending`/`confirmed` sulla riga di associazione, così il genitore può inserire da solo una richiesta senza mai poterla auto-confermare, e sposta il fix per AC3 in un unico punto (`get_parent_player_ids()`) che propaga automaticamente la regola alle quattro policy dipendenti, senza toccarle una per una.

- **Migrazione DB**: nuovo enum `parent_link_status` (`pending`/`confirmed`); colonna `status` su `parent_players` con `DEFAULT 'confirmed'` (le inserzioni admin restano dirette e immediatamente attive, comportamento invariato); nuova policy `parent_players_insert_self_request` che permette al genitore di inserire solo righe con `parent_profile_id = auth.uid()` e `status = 'pending'` (mai altro valore, mai per un altro genitore); `get_parent_player_ids()` filtra su `status = 'confirmed'` — fix minimale che risolve AC3 per tutte e quattro le policy dipendenti in un colpo solo.
- **Due RPC SECURITY DEFINER, non un CRUD generico** (stesso pattern di `create_payment_plan`/`get_financial_trend` già in uso nel progetto): `search_players_for_parent_request(p_query text)` — riservata a `get_user_role() = 'parent'`, lunghezza minima query, restituisce solo `id, first_name, last_name, team_sector` (nessun dato sensibile), usata per il picker di ricerca durante la richiesta; `get_my_parent_players()` — restituisce le righe (pending **e** confirmed) del genitore chiamante con i dati minimi dell'atleta, bypassando di proposito la RLS restrittiva solo per il proprietario della richiesta (altrimenti il genitore non potrebbe vedere nemmeno il nome del figlio per cui è in attesa di conferma).
- **Nessuna RPC per l'inserimento della richiesta stessa**: un `INSERT` diretto da client con la `WITH CHECK` sopra basta, non c'è logica di business da centralizzare oltre al vincolo già espresso in RLS (KISS — evitare un livello in più dove la RLS risolve già il problema).
- **Frontend**: nuova sezione "I miei figli" in `PortalDashboard.tsx` (stessa area oggi placeholder, coerente col pattern `isParent` già presente) con un nuovo modale `RequestChildLinkModal.tsx` che usa `useFormModal` (singola azione di submit, pattern già consolidato da US-036); nuova tab "Associazioni Genitore-Figlio" in `SettingsModal.tsx`, che segue il pattern *esistente* in quel file (stato locale, azioni asincrone multiple e indipendenti, CRUD diretto via `supabase.from(...)`, non `useFormModal` — esplicitamente escluso da quel hook per lo stesso motivo del resto di `SettingsModal.tsx`).
- **Debito tecnico da sanare prima di scrivere query tipizzate**: `parent_players` non è mai stata inclusa nella generazione dei tipi TypeScript da quando è stata creata in US-002 (`src/types/database.ts` non la conosce) — va rigenerata come primo passo.
- **Documentazione**: aggiungere `parent_players` / `get_parent_player_ids()` alla tabella "Superfici condivise" di CLAUDE.md, indicando che le quattro policy `*_select_parent` dipendono dal filtro `status = 'confirmed'` — così una futura story (US-028, US-029) che tocca la stessa superficie parte già sapendo dell'invariante.

---

## Strategia di Test

Il punto critico non è la UI ma l'invariante di sicurezza: una richiesta `pending` non deve mai risultare in un accesso ai dati del figlio prima della conferma admin, e nessun genitore deve poter leggere o confermare l'associazione di un altro.

- **Integrazione (nuovo `scripts/test-parent-children.mjs`)**: un genitore inserisce una richiesta propria (`pending`) → riuscita; lo stesso genitore tenta di inserirla già `confirmed` o per un altro `parent_profile_id` → bloccato dalla RLS; con la riga ancora `pending`, le policy `players_select_parent`/`medical_select_parent`/`payments_select_parent`/`attendance_select_parent` **non** restituiscono il figlio; dopo che l'admin porta la riga a `confirmed`, le stesse policy iniziano a restituirlo (regressione diretta sullo scenario AC3 di US-002); un secondo genitore non vede né può modificare le righe del primo (`parent_players_select_self`); l'admin (`president`/`director`) crea, conferma e rimuove liberamente; un ruolo non-admin diverso da `parent` (es. `coach`) non ha accesso a nessuna delle nuove policy/RPC.
- **Integrazione (RPC)**: `search_players_for_parent_request` chiamata da un ruolo diverso da `parent` non restituisce righe; la query sotto la lunghezza minima non restituisce righe; le colonne restituite sono solo quelle minime attese (nessun `tax_code`/`address_*`/dato medico o finanziario in output); `get_my_parent_players` chiamata da due genitori diversi restituisce solo le rispettive righe.
- **Regressione (obbligatoria pre-merge, `parent_players`/`get_parent_player_ids` è superficie condivisa da US-002)**: `npx supabase db reset` seguito da `npm run test:integration` — con particolare attenzione a `test-rls.mjs`, che copre già gli scenari `parent` di US-002 e deve restare verde dopo il filtro `status = 'confirmed'`.
- **Type-check**: `npx tsc --noEmit` dopo la rigenerazione dei tipi e le nuove chiamate a `parentService`.
- **Manuale (UI, per ruolo)**: login come `parent` → cerca un atleta per nome, invia la richiesta, la vede in stato "In attesa" nella sezione "I miei figli"; login come `president`/`director` → apre la tab "Associazioni Genitore-Figlio" in `SettingsModal.tsx`, vede la richiesta pending, la conferma; il genitore (nuova sessione/refresh) vede ora il figlio confermato; l'admin rimuove l'associazione e il genitore smette di vederlo.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione: stato associazione e RLS self-request | Nuovo enum `parent_link_status`, colonna `status` su `parent_players` (default `confirmed`), aggiornamento `get_parent_player_ids()` per filtrare `status = 'confirmed'`, nuova policy `parent_players_insert_self_request` (solo righe proprie, sempre `pending`) | Impl | - |
| DONE | TASK-02 | Migrazione: RPC di ricerca e di lettura per il genitore | `search_players_for_parent_request(p_query)` (SECURITY DEFINER, solo ruolo `parent`, campi minimi) e `get_my_parent_players()` (SECURITY DEFINER, righe proprie con dati minimi dell'atleta, qualunque stato) | Impl | TASK-01 |
| DONE | TASK-03 | Test integrazione RLS/RPC | Nuovo `scripts/test-parent-children.mjs`: isolamento tra genitori, blocco auto-confirm, effetto del filtro `status` sulle 4 policy dipendenti, restrizioni delle due RPC | Test | TASK-02 |
| DONE | TASK-04 | Rigenerazione tipi TypeScript | Rigenerare `src/types/database.ts` (`parent_players`, enum `parent_link_status`, firme delle nuove RPC) | Impl | TASK-02 |
| DONE | TASK-05 | Service layer `parentService.ts` | `searchPlayersForRequest`, `requestChildLink` (insert diretto), `getMyChildren`; lato admin: `listParentLinkRequests`, `createParentLink`, `confirmParentLink`, `removeParentLink` | Impl | TASK-04 |
| DONE | TASK-06 | Sezione "I miei figli" in `PortalDashboard.tsx` | Lista figli confermati + badge "In attesa" per le richieste pending, pulsante che apre il modale di richiesta | Impl | TASK-05 |
| DONE | TASK-07 | Modale `RequestChildLinkModal.tsx` | Ricerca atleta per nome (debounced, via `searchPlayersForRequest`), selezione, submit con `useFormModal` | Impl | TASK-05 |
| DONE | TASK-08 | Tab "Associazioni Genitore-Figlio" in `SettingsModal.tsx` | Lista richieste pending (Conferma/Rimuovi), lista associazioni confermate (Rimuovi), form di creazione diretta (profilo genitore + ricerca atleta via `athleteService`) | Impl | TASK-05 |
| DONE | TASK-09 | Aggiornamento CLAUDE.md — Superfici condivise | Aggiungere riga `parent_players` / `get_parent_player_ids()` con le story che la toccano e l'invariante `status = 'confirmed'` da preservare | Impl | TASK-01 |
| DONE | TASK-10 | Verifica manuale end-to-end multi-ruolo | Genitore richiede → admin conferma → genitore vede il figlio; admin rimuove → il figlio scompare | Test | TASK-06, TASK-07, TASK-08 |
| DONE | TASK-11 | Regressione completa | `npx supabase db reset` + `npm run test:integration` (in particolare `test-rls.mjs`) + `npx tsc --noEmit` | Test | TASK-03, TASK-06, TASK-07, TASK-08 |

---

_Piano generato via Archetipo Planning — 2026-07-16_
