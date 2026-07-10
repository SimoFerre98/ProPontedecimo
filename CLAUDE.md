# CLAUDE.md — Pro Pontedecimo Manager

Istruzioni di progetto per qualunque agente (Claude o altro) che lavora su questo repository. Sono vincolanti quanto le istruzioni dirette dell'utente: non vanno ignorate per velocizzare un task.

## Cos'è questo progetto

Gestionale per la società calcistica ASD Pro Pontedecimo: anagrafica atleti, stagioni sportive, pagamenti, presenze, visite mediche. Stack: React + TypeScript + Vite + Tailwind sul frontend, Supabase (Postgres + RLS + Edge Functions) sul backend.

---

## Pipeline di sviluppo

Ogni user story segue questo flusso, tracciato in `docs/BACKLOG.md`:

```
TODO → PLANNED → IN PROGRESS → REVIEW → DONE
```

1. **Backlog**: una story per file in `docs/backlog/US-XXX-<slug>.md`; `docs/BACKLOG.md` è solo l'indice (tabelle per epica, colonna Status). Story e piano NON condividono lo stesso nome file.
2. **Plan** (`/archetipo-plan`): produce `docs/planning/US-XXX-plan.md`. Quando la soluzione tecnica tocca una tabella o una RPC già scritta da un'altra story (vedi "Superfici condivise" sotto), il piano deve elencare esplicitamente chi altro scrive lì e come la nuova modifica coesiste con quel codice — non basta soddisfare i propri criteri di accettazione in isolamento.
3. **Implement**: branch `feature/US-XXX` staccato da `dev` nel repo principale. **Mai worktree** per le user story, anche se una skill lo prescrive di default.
4. **Review + merge in `dev`**: fatta da Claude su richiesta esplicita dell'utente. Prima di segnare una story `DONE`:
   - Eseguire `npm run test:integration` (lancia tutte le suite in `scripts/test-*.mjs` contro Supabase locale) — **non solo i test della nuova story**. Le migrazioni condividono tabelle tra story diverse; un test verde della sola story appena scritta non basta a escludere regressioni su story già mergiate.
   - Fare girare `npx tsc --noEmit`.
   - Per modifiche DB (trigger, RPC, RLS): resettare Supabase locale (`npx supabase db reset`) e verificare manualmente lo scenario cross-story più a rischio, non solo il caso felice della nuova story.
5. **Merge in `main`**: **automatico subito dopo ogni merge in `dev`** riuscito (test verdi, review pulita) — non richiede conferma esplicita story per story, salvo diversa indicazione dell'utente in quella conversazione.

## Convenzioni Git

- **Mai il trailer `Co-Authored-By: Claude ...`** nei commit.
- **Mai `git worktree`**: si lavora su branch `feature/*` nel repo principale.
- **Merge vero, mai squash**: `git merge --no-ff` quando si mergia `feature/*` su `dev` (e `dev` su `main`), così il branch risulta effettivamente merged su Git/GitHub.
- Conventional Commits per i messaggi. Branch remoti non si cancellano.

---

## KISS: la semplicità si giudica sull'intero sistema, non sulla singola story

La violazione di KISS più costosa vista finora in questo progetto non è stata "codice complicato", ma un vincolo a livello database dichiarato in modo incondizionato senza considerare chi altro scrive sulla stessa tabella (US-009: un trigger `BEFORE INSERT OR UPDATE` su `players` che validava sempre l'intera riga ha rotto in silenzio il wizard di nuova stagione di US-008, la sincronizzazione delle visite mediche, e i test RLS di US-002 — tutte scritture legittime già in `dev`).

Regola pratica per qualunque migrazione che aggiunge un trigger, un vincolo NOT NULL-like, o cambia una RLS policy su una tabella condivisa:

1. **Grep prima di scrivere**: cercare ogni INSERT/UPDATE esistente su quella tabella (codice applicativo, altre migration, script di test) prima di rendere una regola incondizionata.
2. **Preferire il meccanismo più stretto che risolve il problema**: se la regola serve solo per bloccare un flusso specifico (es. "il form di creazione atleta non deve salvare dati incompleti"), valutare se basta la validazione a livello applicativo prima di imporre un vincolo globale che intercetta ogni scrittura, comprese quelle di sistema.
3. **Se un vincolo globale è davvero necessario**, prevedere fin da subito un meccanismo di bypass esplicito e documentato (es. flag di sessione `SET LOCAL app.bypass_x`) per le scritture di sistema legittime, invece di scoprirlo dopo che qualcosa si è rotto.
4. **Su UPDATE, rivalidare solo ciò che cambia davvero** (confronto `NEW` vs `OLD` sui soli campi vincolati) invece di ri-controllare l'intera riga a ogni scrittura, così un update che tocca una colonna non vincolata su una riga storicamente incompleta non viene bloccato da un problema che non sta nemmeno toccando.

## Superfici condivise (tabelle/RPC toccate da più story)

Aggiornare questa lista quando una nuova story tocca una di queste tabelle o ne aggiunge una nuova a rischio di collisione.

| Tabella / RPC | Story che la toccano | Cosa verificare prima di aggiungere vincoli |
|---|---|---|
| `players` | US-002 (RLS), US-003 (indici), US-007/US-008 (season copy via `create_season_from_wizard`), US-009 (trigger validazione), US-016 (colonna `previous_player_id` per il trascinamento insoluti), `sync_medical_expiry` trigger (baseline) | Wizard di stagione (copia storica), sync visite mediche, `scripts/test-rls.mjs`, `scripts/test-rpc-wizard.mjs` |
| `seasons` | US-007 (selettore), US-008 (wizard), US-009 (fixture di test) | `is_active` è univoco (indice parziale): ogni INSERT/UPDATE che tocca `is_active` deve gestire il flag sulla riga precedente |
| `create_season_from_wizard` (RPC) | US-008, US-009 (bypass validazione), US-016 (calcolo e insert del debito pregresso nella stessa transazione) | Qualunque nuova validazione su `players` deve prevedere esplicitamente il caso "copia da stagione precedente"; qualunque modifica alla copia atleti deve mantenere `previous_player_id` valorizzato, da cui dipende il calcolo insoluti di US-016 |
| `payments` | US-003 (indici), US-015 (piano rate multi-installment via `create_payment_plan`), US-016 (riga `plan='carried_over'` per il debito pregresso) | US-015 riscrive per intero le rate `pending` di un player+season a ogni salvataggio piano — qualunque nuova story che scriva su `payments` (es. US-021 export, US-029 pagamenti online) deve considerare questo comportamento "delete + reinsert" e il blocco se esistono rate già `paid`; **US-016 introduce righe `plan='carried_over'` che vanno escluse da quel delete+reinsert** (vedi riga sotto) |
| `create_payment_plan` (RPC) | US-015, US-016 (esclude le righe `plan='carried_over'` dal delete/overwrite e dalla numerazione) | SECURITY DEFINER con controllo ruolo manuale (solo `president`/`director`); valida che la somma delle rate coincida con l'importo totale (tolleranza 1 centesimo) e blocca la sovrascrittura se esistono rate `paid` per quel player+season **tra quelle non `carried_over`** |
| `attendance` | US-002 (RLS), US-017 (stato presenze tri-stato) | Verificare `test-rls.mjs`, `test-attendance.mjs`, vincolo di unicità `(player_id, session_date, type)` |

---

## Test di integrazione

Gli script in `scripts/test-*.mjs` sono suite di integrazione reali (non mock) contro Supabase **locale**. Vanno eseguiti con:

```bash
npx supabase db reset      # applica tutte le migrazioni da zero
npm run test:integration   # lancia tutte le suite in sequenza
```

**Mai puntare uno script di test contro l'ambiente descritto in `.env`**: quel file può contenere le credenziali del progetto Supabase di produzione. Gli script in `scripts/` devono avere l'URL e la chiave del progetto locale (`http://127.0.0.1:54321` + chiave demo pubblica di `supabase start`) hardcoded o letti da `.env.local` (mai da `.env`). Per verificare manualmente il frontend contro il DB locale, creare un `.env.local` temporaneo (gitignored, sovrascrive `.env` per Vite) e rimuoverlo a fine sessione.

Quando si aggiunge un nuovo `scripts/test-*.mjs`, non serve registrarlo altrove: `npm run test:integration` lo individua automaticamente per pattern di nome file.

---

## Struttura documentazione

- `docs/BACKLOG.md` — indice, non contenuto
- `docs/backlog/US-XXX-<slug>.md` — una story per file
- `docs/planning/US-XXX-plan.md` — piano tecnico per story
- `docs/mockups/US-XXX/` — mockup HTML per story con UI nuova
