# Pro Pontedecimo Manager

Piattaforma gestionale completa per le attività della società sportiva Pro Pontedecimo.
Sviluppata interamente con tecnologie moderne per offrire una user experience premium agli atleti, dirigenti e allenatori.

## 🚀 Tecnologie

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Componenti Glassmorphism, Shadcn/ui
- **Stato & Dati**: React Query, Zustand (opzionale)
- **Backend as a Service**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Animazioni**: Framer Motion, Lucide React

## 📦 Struttura del progetto e Guidelines

Per un approfondimento sulle regole di sviluppo (specie se affidato ad assistenti AI), consulta le direttive centralizzate in `AI/AGENTS.md`.

## 📌 Main Features
- Gestione Anagrafica Atleti
- Controllo Visite Mediche e Scadenze
- Modulo di pagamento integrato e gestione Quote
- Ruoli Utente e RBAC (Admin, Director, Coach, Player, Parent)
- Magazzino e Distinta Vestiario
- Dashboard Analitica e Tracking

## 🔧 Installazione e Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia l'ambiente di sviluppo locale
npm run dev

# Manda in build l'app per la produzione
npm run build
```

## 🗄️ Database e Migrazioni

Lo schema Supabase è versionato con la Supabase CLI in `supabase/migrations/`.
Flusso di lavoro, setup al primo clone e comandi: vedi [docs/database.md](docs/database.md).

## 📜 Versionamento e Branching

Si applica **Strict Git Flow**:
1. Lavorare sempre in branch di `feature/*` staccate da `dev`
2. PR da `feature/*` verso `dev` (sempre con Squash & Merge)
3. Release su `main` previa validazione totale

Consultare il file `CHANGELOG.md` per lo storico completo delle versioni.
