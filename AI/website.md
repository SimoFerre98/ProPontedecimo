# 📂 Specifiche Tecniche (PRD): Gestionale "Pro Pontedecimo Calcio"

**Nome Progetto:** Pro Pontedecimo Manager
**Tipologia:** Web Application (Single Page Application - SPA)
**Utenti Target:** Staff (Presidente, Dirigenti, Allenatori) e Utenti finali (Giocatori/Genitori).

### 1. Stack Tecnologico e Architettura (Vincolante)

- **Core Frontend:** React 18+ inizializzato tramite **Vite** .
- **Linguaggio:** TypeScript (Strict mode abilitato).
- **Routing:** **React Router** (per la navigazione client-side tra dashboard, anagrafiche, ecc.).
- **State Management & Data Fetching:** **TanStack Query (React Query)** per la gestione della cache, degli stati di caricamento e la sincronizzazione con il database.
- **UI Framework:** Tailwind CSS integrato con componenti **Shadcn/ui** .
- **Libreria Grafici:** Recharts o Tremor (per i widget della dashboard).
- **Database e Autenticazione:** **Supabase** (PostgreSQL nativo).
- **Gestione Segreti e API Esterne:** **Supabase Edge Functions** (obbligatorio per eseguire codice server-side sicuro, come l'invio di email, per non esporre chiavi API nel bundle React).
- **Servizio Email:** **Resend** (chiamato esclusivamente dalle Edge Functions di Supabase).
- **Infrastruttura Deploy:** **Railway** (deploy della SPA React tramite container Docker/Nginx, per mantenere l'infrastruttura centralizzata e flessibile per futuri microservizi).

### 2. Design System e UI/UX

- **Stile Visivo:** Dashboard minimale, pulita, stile SaaS moderno con ampio utilizzo di spazi bianchi.
- **Palette Colori:** Colore primario brand "Bordeaux" (HEX `#800020` o `#9E1B32`) da usare per bottoni principali e accenti. Sfondo neutro/chiaro.
- **Responsività:** Approccio mobile-first rigoroso, essenziale per permettere agli allenatori di usare il sistema a bordo campo dallo smartphone.

### 3. Gestione Ruoli e Sicurezza (RBAC)

La sicurezza dei dati deve essere gestita nativamente tramite le **Row Level Security (RLS)** di Supabase in combinazione con Supabase Auth, essendo un'architettura client-heavy.

- **Presidente (Super Admin):** Accesso CRUD totale su tutte le tabelle. Gestione permessi degli altri admin.
- **Dirigente (Admin):** Gestione anagrafiche, pagamenti, dati medici, inventario. Possibilità di innescare l'invio di email massive (tramite Edge Functions) e modificare i prezzi.
- **Allenatore (Staff):** Accesso in lettura/scrittura limitato esclusivamente ai giocatori della propria squadra (Leva). Possibilità di registrare le presenze.
- **Giocatore/Genitore (User):** Accesso in sola lettura al proprio profilo per visualizzare stato pagamenti e scadenza visita medica.

### 4. Logica di Business Core: Lo "Scatto di Leva"

- **Requisito:** L'anno sportivo e fiscale si azzera automaticamente il 1° Luglio di ogni anno.
- **Automazione:** Implementare un cron job tramite l'estensione `pg_cron` di Supabase programmato per il 1° Luglio.
- **Azioni dello Script SQL:** Incremento automatico della categoria (Leva) del giocatore in base all'anno di nascita, generazione delle nuove quote da pagare per la stagione entrante in base al listino aggiornato e archiviazione virtuale della stagione precedente.

### 5. Moduli Funzionali Principali

- **Dashboard Analitica:** Widget per admin con panoramica finanziaria (incassato vs previsto), alert certificati medici in scadenza e grafici sulla distribuzione degli iscritti.
- **Gestione Finanziaria:** Impostazione quota standard per Leva, funzionalità di override manuale per applicare sconti specifici a singoli giocatori e tracciamento dello stato (Saldato, Parziale, Insoluto).
- **Centro Medico:** Tracciamento data visita e scadenza, con invio automatico di email di promemoria ai genitori 30 giorni prima della scadenza (gestito tramite Edge Functions/cron).
- **Registro Presenze:** Interfaccia mobile-friendly per gli allenatori per segnare rapidamente (tramite toggle) i presenti e gli assenti agli allenamenti giornalieri.
- **Gestione Inventario:** Tabella per tracciare il materiale sportivo della società (palloni, casacche) e a chi è stato temporaneamente assegnato.
- **Esportazione Dati:** Bottone globale sulle tabelle principali (Giocatori, Pagamenti, Presenze) per scaricare i dati formattati in un file Excel `.xlsx` utilizzando la libreria client-side `xlsx` (SheetJS).
- **Produttività Personale:** Area privata in stile Kanban o lista per ogni membro dello staff per appuntare note o task operativi.

### 6. Architettura per Sviluppi Futuri

- **Predisposizione Dati:** Strutturare il database tenendo conto di una futura integrazione di una tabella `messages` per sfruttare i WebSocket di Supabase (Realtime) per una chat interna, e l'abilitazione dell'estensione `pgvector` per future integrazioni AI.
