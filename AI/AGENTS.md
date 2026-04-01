# AI Developer Guidelines: Pro Pontedecimo Manager

Queste linee guida servono a garantire che qualsiasi assistente AI che interviene sul progetto mantenga lo stesso workflow e standard qualitativo.

## Workflow Generale
1. **Atteggiamento**: Comportati sempre come un Senior Developer esperto. Fai scelte architetturali sensate e propositive, prevedendo limitazioni o edge cases.
2. **Step by Step**: Affronta le richieste in modo metodico. Dividi i task complessi in piccoli step logici ed esegui un set limitato di operazioni per volta.

## Strategia di Branching (IMPORTANTE)

La repository usa una strategia a **3 livelli**:

```
main (produzione) ← dev (integrazione) ← feature/* (sviluppo)
```

### Regole
- **`main`** = ambiente di produzione. Si mergia SOLO da `dev` quando una release è testata e stabile. **Non si lavora mai direttamente su main.**
- **`dev`** = branch di integrazione. Tutte le feature vengono mergiare qui prima di andare in produzione. È il branch "staging".
- **`feature/*`** = branch di lavoro. Ogni nuova feature o fix parte da `dev` e torna in `dev` via Pull Request.

### Workflow per ogni feature
1. **Crea branch da `dev`**: `git checkout dev && git pull origin dev && git checkout -b feature/nome-feature`
2. **Lavora sulla feature** con commit descrittivi (Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`)
3. **Push + PR verso `dev`**: `git push origin feature/nome-feature` → apri PR verso `dev` su GitHub
4. **Merge nella PR** con metodo `squash` per mantenere la history pulita
5. **NON eliminare mai le branch**, neanche dopo che sono state mergiate (richiesta esplicita dell'utente).

### Release in produzione (futuro con CI/CD)
Quando `dev` è stabile e testato → PR da `dev` verso `main` → merge con `merge commit` (non squash, per tracciabilità).

## Gestione Git e Versionamento

### Commits
- Messaggi di commit: `feat: descrizione`, `fix: descrizione`, `chore: descrizione`, `docs: descrizione`.
- Usa sempre **Conventional Commits**: https://www.conventionalcommits.org
- **Mergia sempre con squash** per le feature branch verso `dev`.
- **Non committare mai** `.env`, secrets o file sensibili.

## Workflow di Sviluppo

### Branching Strategy
- Il branch principale è `main`.
- Il branch di integrazione è `dev`.
- Ogni nuova feature o fix deve essere sviluppata su un branch dedicato (es: `feature/staff-tasks`, `fix/athletes-syntax`).
- **IMPORTANTE**: I branch non devono MAI essere cancellati dopo il merge. Devono rimanere come storico dello sviluppo.

### Versionamento e Tagging
- Usiamo il versionamento semantico (es: v1.0.0).
- Ogni milestone significativa o release stabile deve essere taggata su Git.
- I tag devono essere parlanti (es: `v0.5.0-staff-module-beta`).

### Changelog
- Ogni modifica significativa deve essere registrata nel file `CHANGELOG.md`.
- Dividere per versioni e categorie (Aggiunto, Corretto, Modificato).

### Passaggi Operativi
1. Analisi dei requisiti e pianificazione.
2. Sviluppo su branch dedicato.
3. Test e risoluzione linting (non lasciare mai warning o errori).
4. Merge su `dev` (o `main` se release).
5. Tagging della versione se milestone raggiunta.
6. Aggiornamento `CHANGELOG.md`.

## Utilizzo Database (Supabase)
- Progetto: `propontedecimo` (ID: `nkfbctwduojwxuvwjhdm`, region: `eu-central-1`)
- Sfrutta le funzionalità MCP per migrazioni, query e verifica RLS
- **Applica always `apply_migration`** per DDL, `execute_sql` solo per query/DML
- Dopo ogni migrazione DDL: esegui `get_advisors(security)` e `get_advisors(performance)`
- Utenti test (password: `ProPonte2025`):
  - `president@proponte.test` → ruolo: president
  - `director@proponte.test` → ruolo: director
  - `coach@proponte.test` → ruolo: coach
  - `player@proponte.test` → ruolo: player

## Codice e Qualità
- Usa sempre TypeScript in Strict Mode (`verbatimModuleSyntax` abilitato)
- Crea componenti piccoli e riutilizzabili
- **Design Estremamente Premium (WOW factor)**:
  - **Colori**: Base bordeaux `#800020` con accenti oro/bianco.
  - **Stile**: Glassmorfismo spinto (`backdrop-blur`), trasparenze, effetti di luce e ombre soffuse.
  - **Forme**: Tutto deve essere arrotondato (`rounded-xl` o superiore) o a "pillola" (`rounded-full`).
  - **Navigazione**: Floating hamburger menu (un bottone flottante che apre la navigazione in overlay glassmorfico). Evitare sidebar fisse invasive se non espressamente richiesto.
  - **Animazioni**: Micro-interazioni fluide (framer-motion o CSS transitions).
- Usa Tailwind CSS v4 + Shadcn/ui per lo styling
- Usa TanStack Query per il fetching dei dati e la gestione dello state asincrono

## Contesto Tecnologico
- Frontend: React 18+ (Vite), TypeScript, Tailwind CSS v4, Shadcn/ui
- Routing: React Router v7
- State/Fetch: TanStack Query
- Backend/DB/Auth: Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- Deploy: Railway (da configurare)
- Email: Resend (da configurare)
