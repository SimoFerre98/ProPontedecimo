# US-001: Configurazione Supabase CLI e migrazioni versionate — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-04
**Stato:** ✅ COMPLETATO — squash & merge su `dev` (commit `4917814`, 2026-07-05) dopo code review (2 cicli)

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** HIGH | **Story Points:** 2

**Story**
Come sviluppatore del progetto,
voglio configurare la Supabase CLI in locale con lo schema del database versionato in migrazioni,
così che ogni modifica allo schema sia tracciata, riproducibile e applicabile sia sul cloud che sulla futura VPS.

**Criteri di Accettazione**
- [ ] La Supabase CLI è configurata e collegata al progetto cloud esistente
- [ ] Lo schema attuale (tabelle, funzioni, trigger, RPC `get_dashboard_stats`) è esportato come migrazione iniziale versionata nel repository
- [ ] Una nuova modifica di schema applicata via migrazione locale si riflette correttamente sull'ambiente cloud
- [ ] Il flusso di lavoro delle migrazioni è documentato nel repository

---

## Soluzione Tecnica

Adottiamo il flusso standard della Supabase CLI (init → link → db pull) usando il progetto cloud esistente come fonte di verità iniziale: lo schema remoto viene fotografato in una migrazione timestampata, e da lì in poi ogni modifica passa da migrazioni locali pushate verso il cloud. È la via più "noiosa e collaudata", ed è lo stesso meccanismo che permetterà di riapplicare l'intero schema sulla VPS self-hosted (US-023/US-024).

- **Init & pinning della CLI:** `supabase init` genera `supabase/config.toml`; la CLI viene aggiunta come devDependency (`supabase`) con script npm dedicati (`db:new`, `db:pull`, `db:push`, `db:diff`) così la versione è bloccata nel lockfile e il flusso è uniforme per chiunque cloni il repo. `.gitignore` aggiornato con `supabase/.temp/`.
- **Collegamento al cloud:** `supabase link --project-ref <ref>` — il project-ref si ricava dall'URL in `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`). Richiede `SUPABASE_ACCESS_TOKEN` (da account Supabase) e la password del database: **prerequisito a carico di Simone**, i segreti non entrano nel repository.
- **Bonifica pre-pull:** lo script manuale `supabase/migrations/payments_update.sql` (già eseguito nel SQL Editor, nome non conforme al formato `<timestamp>_nome.sql`) viene archiviato in `scripts/sql-archive/` per non interferire con la CLI; il suo contenuto è già nello schema cloud e sarà catturato dal pull. Gli script di import dati in `migration/` (INSERT atleti da Excel) restano dove sono: sono seed storici, non schema.
- **Migrazione iniziale:** `supabase db pull` genera la migrazione baseline dello schema `public` (tabelle, funzioni incluse `get_dashboard_stats`, trigger, policy RLS esistenti) e registra la history sul remoto.
- **Verifica del flusso in avanti (AC3):** una migrazione di prova innocua (`COMMENT ON TABLE public.players IS ...`) creata con `db:new` e applicata con `db:push` dimostra il ciclo locale → cloud senza toccare lo scope di altre storie (gli indici restano in US-003).
- **Documentazione:** `docs/database.md` descrive il flusso (creare, applicare, allineare le migrazioni; cosa fare al primo clone), linkato dal README. Lo sviluppo locale con `supabase start` (richiede Docker) è citato come passo opzionale futuro, fuori scope.

---

## Strategia di Test

Storia infrastrutturale senza codice applicativo: la qualità si verifica con controlli di stato binari sull'allineamento locale/remoto e uno smoke test dell'app.

- **Allineamento history:** `supabase migration list` mostra la migrazione baseline (e quella di prova) presenti e sincronizzate sia in locale che sul remoto — verifica manuale/CLI
- **Completezza della baseline:** `supabase db diff --linked` subito dopo il pull non produce differenze (lo schema è interamente catturato) — verifica CLI
- **Non-regressione app:** smoke test manuale — login e Dashboard caricano correttamente (la RPC `get_dashboard_stats` risponde), lista atleti e pagamenti funzionano come prima
- **Riproducibilità:** su un checkout pulito, `npm install` + istruzioni di `docs/database.md` portano a un ambiente in grado di creare e pushare una migrazione (verifica del flusso documentato)

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Init progetto CLI e tooling npm | Eseguire `supabase init`, aggiungere `supabase` come devDependency con script npm `db:new`/`db:pull`/`db:push`/`db:diff`, aggiornare `.gitignore` con `supabase/.temp/`. | Impl | - |
| DONE | TASK-02 | Archiviazione script SQL manuali | Spostare `supabase/migrations/payments_update.sql` in `scripts/sql-archive/` verificando prima che il suo contenuto sia già applicato sul cloud (colonne payments, funzione dashboard). | Impl | - |
| DONE | TASK-03 | Link al progetto cloud | Ricavare il project-ref da `VITE_SUPABASE_URL` ed eseguire `supabase link`. Richiede `SUPABASE_ACCESS_TOKEN` e password DB forniti da Simone (mai committati). | Impl | TASK-01 |
| DONE | TASK-04 | Migrazione baseline con db pull | Eseguire `supabase db pull` e committare la migrazione iniziale timestampata dello schema `public`. | Impl | TASK-02, TASK-03 |
| DONE | TASK-05 | Verifica completezza baseline | Eseguire `supabase db diff --linked` (atteso: nessuna differenza) e `supabase migration list` (atteso: history allineata). | Test | TASK-04 |
| DONE | TASK-06 | Migrazione di prova e push (AC3) | Creare con `db:new` una migrazione `COMMENT ON TABLE public.players` e applicarla con `db:push`; verificare in `migration list` che risulti applicata sul remoto. | Impl | TASK-04 |
| DONE | TASK-07 | Smoke test applicativo | Avviare l'app e verificare login, Dashboard (RPC `get_dashboard_stats`), lista atleti e pagamenti: nessuna regressione dopo le operazioni sul DB. | Test | TASK-06 |
| DONE | TASK-08 | Documentazione del flusso | Scrivere `docs/database.md` (flusso migrazioni, onboarding primo clone, nota su `supabase start`/Docker come opzione futura) e linkarlo dal README. | Impl | TASK-06 |

---

_Piano generato via Archetipo Planning — 2026-07-04_
