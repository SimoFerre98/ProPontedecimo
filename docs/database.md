# Database — Migrazioni con Supabase CLI

Lo schema del database è versionato nel repository tramite la **Supabase CLI** (installata come devDependency). La fonte di verità è la cartella [`supabase/migrations/`](../supabase/migrations/): ogni modifica allo schema passa da una migrazione, mai da modifiche manuali nel SQL Editor.

## Setup al primo clone

1. `npm install` — installa anche la CLI (`supabase` in devDependencies)
2. Autenticati alla CLI. ⚠️ La CLI **non** legge automaticamente il `.env` di root: le variabili devono stare nell'ambiente del processo. Due alternative:
   - **Consigliata:** `npx supabase login` (apre il browser, il token resta salvato nel profilo utente)
   - **Oppure:** esporta il token nella shell prima dei comandi:
     ```bash
     # bash / Git Bash
     export SUPABASE_ACCESS_TOKEN="<token da app.supabase.com/account/tokens>"
     ```
     ```powershell
     # PowerShell
     $env:SUPABASE_ACCESS_TOKEN = "<token>"
     ```
3. Tieni la password Postgres del progetto a portata di mano (Dashboard → Settings → Database): serve nella connection string del pooler (sotto) o al prompt interattivo. Puoi annotarla nel `.env` locale (`SUPABASE_DB_PASSWORD`, mai committato) come promemoria, ma ricorda che i comandi non la leggono da lì in automatico.
   - ⚠️ **Mai** prefissare i segreti con `VITE_`: le variabili `VITE_*` finiscono nel bundle client
4. Collega il progetto cloud:
   ```bash
   npx supabase link --project-ref nkfbctwduojwxuvwjhdm
   ```

## Nota di rete: usare il session pooler

La connessione diretta (`db.<ref>.supabase.co:5432`) è IPv6-only e spesso non raggiungibile. Per i comandi che toccano il database, passare esplicitamente la connection string del **session pooler** (IPv4):

```
postgresql://postgres.nkfbctwduojwxuvwjhdm:<SUPABASE_DB_PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

(il cluster di questo progetto è `aws-1-eu-central-1`; la stringa esatta è in Dashboard → Connect → Session pooler)

## Flusso di lavoro

| Operazione | Comando |
|---|---|
| Creare una migrazione | `npm run db:new -- <nome_descrittivo>` |
| Applicare al cloud | `npm run db:push -- --yes --db-url "<pooler-url>"` |
| Verificare allineamento | `npm run db:list -- --db-url "<pooler-url>"` |
| Diff schema remoto vs migrazioni | `npm run db:diff -- --db-url "<pooler-url>"` (richiede Docker) |

Regole:

- **Una migrazione per modifica logica**, con nome descrittivo (es. `add_registration_number_to_players`)
- ⚠️ `migration new` genera il timestamp in **UTC**: se crei file a mano, mantieni l'ordinamento cronologico corretto rispetto alle migrazioni esistenti
- In modalità non interattiva (script, CI, agenti) usare sempre `--yes` su `db push`: senza, il prompt di conferma resta appeso
- Non modificare mai una migrazione già pushata: crearne una nuova correttiva

## Baseline

La migrazione `20260704154518_baseline_schema.sql` fotografa lo schema completo al 2026-07-04 (9 tabelle, funzioni incluse `get_dashboard_stats`, trigger, 27 policy RLS). Include in coda anche oggetti che il dump automatico non copre:

- il trigger `on_auth_user_created` su `auth.users` (creazione automatica del profilo alla registrazione)
- le estensioni `pg_net` e `pg_graphql`

Sul progetto cloud attuale la baseline è marcata come già applicata (repair `--status applied`); verrà eseguita per intero solo su ambienti nuovi, come la futura VPS self-hosted (US-023/US-024).

## Storia e artefatti legacy

- `scripts/sql-archive/payments_update.sql` — script manuale pre-CLI (colonne rate su `payments`, funzione dashboard): già applicato al cloud e catturato dalla baseline; conservato solo come storico
- `migration/*.sql` — script una-tantum di import dati atleti da Excel (INSERT): **non sono migrazioni di schema** e non vanno spostati in `supabase/migrations/`
- Le 14 voci di history remote orfane (marzo-aprile 2026, dal setup iniziale del progetto) sono state marcate `reverted` il 2026-07-04 per ripartire dalla baseline

## Modello RLS (US-002)

L'accesso ai dati è governato da Row Level Security con ruoli in `profiles.role` (`president`, `director`, `coach`, `player`, `parent`), letti dalle policy tramite `get_user_role()` (SECURITY DEFINER).

**Associazioni:**
- `coach_teams (profile_id, team_sector)` — leve seguite da ciascun allenatore (match testuale con `players.team_sector`)
- `parent_players (parent_profile_id, player_id)` — figli associati a ciascun genitore
- Entrambe gestibili solo da president/director; l'interessato legge le proprie righe

**Matrice di accesso sintetica:**

| Tabella | President | Director | Coach | Player | Parent |
|---|---|---|---|---|---|
| players | CRUD | CRUD | R (proprie leve) | R (proprio record) | R (figli associati) |
| attendance | CRUD | CRUD | CRUD (proprie leve) | R (proprie) | R (figli) |
| medical_visits | CRUD | CRUD | R (proprie leve) | R (proprie) | R (figli) |
| payments | CRUD | CRUD | — | R (propri) | R (figli) |
| profiles | RU (+ruoli) | RU (no ruoli) | R/U proprio | R/U proprio | R/U proprio |
| seasons | CRUD | R | R | R | R |
| email_usage | CR | CR | CR | — | — |

> Su `profiles` non esistono policy DELETE e l'INSERT via API è consentito solo per il proprio `id` (la creazione dei profili passa dal trigger `handle_new_user` alla registrazione); la modifica del campo `role` è riservata al Presidente dal trigger anti-escalation, che copre anche l'INSERT.

**Anti-escalation:** il trigger `trg_enforce_role_change` su `profiles` blocca ogni modifica di `role` da parte di chi non è president (il `service_role`, con `auth.uid()` NULL, resta libero per gli strumenti amministrativi). Le policy non possono confrontare OLD/NEW: per questo è un trigger e non una policy.

**Verifica:** `node scripts/test-rls.mjs` esegue la matrice di accesso completa contro il cloud con utenti di prova `TEST_RLS_*` (creazione, asserzioni per i 5 ruoli + anonimo, cleanup). Richiede `SUPABASE_SERVICE_ROLE_KEY` nel `.env`.

## Sviluppo locale (opzionale, futuro)

`npx supabase start` avvia l'intero stack Supabase in locale via Docker (Postgres, Auth, Studio). Non è richiesto per il flusso attuale: le migrazioni si applicano direttamente al cloud. Da valutare quando servirà sviluppare Edge Functions (US-006) o testare RLS in isolamento (US-002).
