# US-007: Selettore stagione globale in header — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-06

---

## User Story

**Epic:** EP-002 — Gestione Stagioni Sportive
**Priorità:** HIGH | **Story Points:** 3

**Story**
Come Dirigente,
voglio selezionare la stagione attiva da un menu a tendina nell'header,
così che tutti i dati del pannello (atleti, presenze, pagamenti) si filtrino dinamicamente sulla stagione scelta.

**Criteri di Accettazione**
- [ ] Il dropdown in header mostra lo storico delle stagioni e quella attiva è evidenziata
- [ ] La stagione selezionata è gestita in uno store Zustand globale (insieme a sessione utente e tema) e persiste alla navigazione tra pagine
- [ ] Atleti, presenze e pagamenti visualizzati rispettano la stagione selezionata
- [ ] Se esiste una sola stagione, il selettore la mostra senza errori né stati vuoti anomali
- [ ] Le stagioni sono caricate dinamicamente dal database (rimosso l'array hardcoded `SEASONS` in `DashboardLayout.tsx`)

---

## Soluzione Tecnica

Il dropdown stagione in `DashboardLayout.tsx` esiste già a livello visivo (animazioni, badge, click-outside) ma è pura scenografia: l'array `SEASONS` è hardcoded e `selectedSeason` è uno `useState` locale senza persistenza né effetto sui dati. La tabella `seasons` esiste già in DB (`is_active` con vincolo UNIQUE quando true, RLS che permette la SELECT a ogni utente autenticato) e `players`/`payments` hanno già la colonna `season_id`, ma nessuna query la usa oggi. Questa story introduce **Zustand** nel progetto per la prima volta — richiesto esplicitamente dall'AC2 "insieme a sessione utente e tema" — con uno store unico a tre slice, dove solo la stagione riceve logica business piena; le altre due slice si integrano in modo pragmatico con ciò che già esiste, senza riscrivere l'autenticazione (rischio non giustificato per 3 story point e non richiesto da nessun AC verificabile).

- **`src/store/useAppStore.ts`** (nuova dipendenza `zustand` + middleware `persist`): store unico con tre slice — `season` (`seasons[]`, `selectedSeasonId`, `activeSeasonId`, `setSelectedSeason`, con fallback sulla stagione attiva se l'id persistito non esiste più tra quelle caricate), `theme` (migrazione 1:1 di `useTheme.ts`, stessa chiave `localStorage` `propontedecimo-theme` per non rompere le preferenze esistenti) e `auth` (campi `profile`/`role` in sola lettura, scritti da `AuthProvider` quando cambia sessione — l'ascolto Supabase resta dove si trova oggi). Solo `selectedSeasonId` è persistito in `localStorage` (`propontedecimo-season`); la lista stagioni viene sempre rifetchata.
- **`src/services/seasonService.ts`** (nuovo): `getSeasons()` — tutte le stagioni ordinate per `start_date desc`; la stagione attiva si deriva con `seasons.find(s => s.is_active)`.
- **Migrazione SQL**: `get_dashboard_stats()` guadagna il parametro `p_season_id uuid DEFAULT NULL` e filtra `players`/`payments` per `season_id = coalesce(p_season_id, <id stagione attiva>)` al posto dell'attuale `is_active = true` cablato nella funzione — così la Dashboard resta funzionante anche prima che il frontend passi il parametro.
- **`athleteService.getPlayers`** e **`paymentService.getPayments`**: nuovo parametro opzionale `seasonId` → `.eq('season_id', seasonId)` quando presente.
- **`DashboardLayout.tsx`**: rimozione di `SEASONS` e dello `useState` locale; il dropdown legge `seasons`/`selectedSeasonId` dallo store, idratato via `useQuery(['seasons'], seasonService.getSeasons)` al mount. Badge "attiva" sulla stagione con `is_active`, spunta sulla stagione `selectedSeasonId` (i due possono differire). Se `seasons.length === 1`, il bottone mostra il nome ma il dropdown è disabilitato — niente stato vuoto cliccabile a vuoto.
- **`Athletes.tsx` / `Payments.tsx` / `Dashboard.tsx`**: leggono `selectedSeasonId` dallo store e lo aggiungono alla `queryKey` di React Query (es. `['players', selectedSeasonId, search, ...]`) con `enabled: !!selectedSeasonId` — il refetch alla stagione è automatico via React Query, nessuna invalidazione manuale.
- **Fuori scope**: `Attendance.tsx` (le "presenze" dell'AC3) è oggi un `PlaceholderPage` — US-017 non è ancora implementata, quindi non c'è query reale da filtrare; lo store espone comunque `selectedSeasonId` pronto per quando la feature verrà costruita. Cambiare quale stagione sia `is_active` resta di competenza del wizard US-008.

---

## Strategia di Test

Story a metà tra infrastruttura (nuovo store, nuova dipendenza) e wiring di dati esistenti: il focus è verificare che il filtro si propaghi correttamente e che i casi limite (una sola stagione, stagione persistita non più valida) non producano stati anomali.

- **Store Zustand** (unit): `setSelectedSeason` aggiorna lo stato e persiste in `localStorage`; al reload la selezione viene ripristinata; se l'id persistito non esiste più tra le stagioni caricate, fallback sulla stagione attiva senza errori
- **Filtro dati per stagione** (unit/integration su service): `athleteService.getPlayers(seasonId, ...)` e `paymentService.getPayments(..., seasonId)` costruiscono la query con `.eq('season_id', ...)` solo quando `seasonId` è presente
- **RPC dashboard** (integration, via Supabase locale): `get_dashboard_stats(p_season_id)` ritorna conteggi filtrati sulla stagione passata; chiamata senza parametro ritorna gli stessi risultati di oggi (fallback sulla stagione attiva) — nessuna regressione
- **Dropdown header** (e2e manuale, AC1/AC4): con più stagioni in DB, la stagione attiva è evidenziata e le altre selezionabili; con una sola stagione a DB, il dropdown mostra il nome senza freccia/apertura a vuoto
- **Propagazione end-to-end** (e2e manuale, AC3): cambiando stagione dal dropdown, le liste Atleti e Pagamenti si aggiornano ai dati della stagione scelta senza refresh manuale della pagina
- **Non-regressione tema** (smoke): dopo la migrazione di `useTheme` nello store, il toggle chiaro/scuro/sistema in `DashboardLayout` continua a funzionare e la preferenza resta persistita tra i reload

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Aggiungere dipendenza Zustand | `npm install zustand`. | Impl | - |
| TODO | TASK-02 | Creare `seasonService.ts` | Nuovo servizio con `getSeasons()` (ordinate per `start_date desc`); la stagione attiva si deriva da `is_active`. | Impl | - |
| TODO | TASK-03 | Creare `useAppStore.ts` (slice season + theme + auth) | Store Zustand unico con `persist`: slice `season` (seasons, selectedSeasonId, activeSeasonId, setSelectedSeason, fallback su id non più valido), slice `theme` (migrazione da `useTheme.ts`, stessa chiave localStorage), slice `auth` (profile/role in sola lettura). | Impl | TASK-01 |
| TODO | TASK-04 | Test unitari store | Selezione stagione, persistenza in localStorage, fallback quando l'id persistito non esiste più, toggle tema invariato. | Test | TASK-03 |
| TODO | TASK-05 | Migrazione SQL `get_dashboard_stats(p_season_id)` | Aggiungere parametro `p_season_id uuid DEFAULT NULL`; filtrare players/payments per `season_id = coalesce(p_season_id, stagione attiva)`. | Impl | - |
| TODO | TASK-06 | Filtro stagione in `athleteService`/`paymentService` | Aggiungere parametro opzionale `seasonId` a `getPlayers` e `getPayments`, con `.eq('season_id', seasonId)` quando presente. | Impl | - |
| TODO | TASK-07 | Test filtro service | Verificare che i service costruiscano la query con `season_id` solo quando `seasonId` è passato; nessuna regressione quando è assente. | Test | TASK-06 |
| TODO | TASK-08 | Rifattorizzare dropdown in `DashboardLayout.tsx` | Rimuovere `SEASONS` hardcoded e `useState` locale; alimentare il dropdown da `useQuery(['seasons'])` + store; badge "attiva" distinto da spunta "selezionata"; disabilitare apertura con una sola stagione. | Impl | TASK-02, TASK-03 |
| TODO | TASK-09 | Migrare `AuthProvider` e header al tema/auth dello store | `AuthProvider` scrive profile/role nello store; `DashboardLayout` usa lo slice `theme` dello store al posto di `useTheme()`. | Impl | TASK-03 |
| TODO | TASK-10 | Collegare `Athletes.tsx` e `Payments.tsx` a `selectedSeasonId` | Aggiungere `selectedSeasonId` alla `queryKey` e come argomento a `athleteService.getPlayers`/`paymentService.getPayments`, con `enabled: !!selectedSeasonId`. | Impl | TASK-06, TASK-08 |
| TODO | TASK-11 | Collegare `Dashboard.tsx` alla stagione selezionata | Passare `selectedSeasonId` come parametro alla RPC `get_dashboard_stats`; sostituire l'etichetta stagione hardcoded ("2024/2025") col nome reale dallo store. | Impl | TASK-05, TASK-08 |
| TODO | TASK-12 | Test propagazione stagione (Atleti/Pagamenti/Dashboard) | Verificare che il cambio stagione dal dropdown aggiorni le liste Atleti/Pagamenti e le statistiche Dashboard senza refresh manuale. | Test | TASK-10, TASK-11 |
| TODO | TASK-13 | Test caso singola stagione | Con una sola riga in `seasons`, il dropdown mostra il nome senza stati vuoti o dropdown apribile a vuoto. | Test | TASK-08 |

---

_Piano generato via Archetipo Planning — 2026-07-06_
