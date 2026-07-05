# US-003: Indici database per filtri atleti e pagamenti — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-05

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come Dirigente,
voglio che le liste di atleti e pagamenti filtrate si carichino rapidamente,
così che il lavoro quotidiano di consultazione non subisca rallentamenti al crescere dei dati.

**Criteri di Accettazione**
- [ ] Gli indici `idx_players_is_active`, `idx_players_medical_expiry` e `idx_payments_status` sono creati via migrazione
- [ ] Il query plan (`EXPLAIN`) delle query di filtro atleti e pagamenti utilizza i nuovi indici
- [ ] Nessuna regressione funzionale nelle liste esistenti dopo l'applicazione degli indici

---

## Soluzione Tecnica

La ricognizione sulla baseline ridimensiona la story: `idx_payments_status` **esiste già** (insieme a `idx_payments_player/season`, `idx_players_season/sector/profile` e agli indici su `medical_visits` e `attendance`). Restano da creare `idx_players_is_active` e `idx_players_medical_expiry`, che corrispondono a filtri reali di `athleteService.getPlayers` (`.eq('is_active', ...)` e `.lt/.gte('medical_expiry', ...)`). Una migrazione minima col flusso CLI ormai rodato.

- **Migrazione `performance_indexes`:** `CREATE INDEX IF NOT EXISTS` per `idx_players_is_active (is_active)` e `idx_players_medical_expiry (medical_expiry)`; commento in migrazione che documenta che `idx_payments_status` è già presente dalla baseline (AC soddisfatto senza no-op ridondanti).
- **Nota tecnica sul boolean:** l'indice su `is_active` serve al planner essenzialmente per il valore raro (`false`, atleti disattivati); per gli attivi (maggioranza delle righe) il seq scan resta la scelta corretta del planner. Creato comunque per l'AC e per il caso "consultazione archivio disattivati", con commento esplicativo.
- **Fuori scope (annotato per il futuro):** la ricerca testuale `ilike '%term%'` su nome/cognome/CF non è indicizzabile con btree; se diventerà lenta servirà `pg_trgm` + indice GIN — da valutare come story dedicata quando i volumi lo giustificheranno.
- **Verifica con dati reali:** `EXPLAIN (ANALYZE)` eseguito direttamente sul cloud via session pooler (client `pg` one-off, non committato) sulle query rappresentative dei filtri.

---

## Strategia di Test

Story infrastrutturale senza codice applicativo: verifica del piano di esecuzione e non-regressione funzionale con strumenti già esistenti.

- **Query plan** (verifica diretta): `EXPLAIN (ANALYZE)` via pooler su (a) filtro scadenze mediche `medical_expiry < oggi`, (b) filtro `is_active = false`, (c) filtro `payments.status = 'pending'` — atteso Index/Bitmap Scan sugli indici dedicati per i casi selettivi
- **Non-regressione** (integration): riesecuzione di `scripts/test-rls.mjs` (23 controlli) — copre le liste atleti/pagamenti per tutti i ruoli dopo la migrazione
- **Versionamento** (CLI): `migration list` allineato locale/remoto dopo il push

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione indici | Creare la migrazione `performance_indexes` con `idx_players_is_active` e `idx_players_medical_expiry` (IF NOT EXISTS) e commento sullo stato di `idx_payments_status` (già in baseline). | Impl | - |
| DONE | TASK-02 | Push al cloud | `db:push --yes` via pooler `aws-1` e verifica `migration list` allineata. | Impl | TASK-01 |
| DONE | TASK-03 | Verifica query plan | `EXPLAIN (ANALYZE)` via pooler sulle query rappresentative dei filtri atleti/pagamenti; conferma dell'uso degli indici nei casi selettivi. | Test | TASK-02 |
| DONE | TASK-04 | Non-regressione | Riesecuzione `scripts/test-rls.mjs` (23 controlli attesi verdi). | Test | TASK-02 |
| DONE | TASK-05 | Documentazione | Nota indici in `docs/database.md` e voce CHANGELOG. | Impl | TASK-03 |

---

_Piano generato via Archetipo Planning — 2026-07-05_
