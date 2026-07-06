# Backlog di Sviluppo: Pro Pontedecimo Manager

Questo documento funge da specifica dettagliata per la generazione di un backlog operativo di sviluppo per la web application **Pro Pontedecimo Manager**. È strutturato in tre macro-fasi logiche: Pulizia e Ottimizzazione, Studio e Progettazione Architetturale, e Implementazione delle Nuove Feature.

---

## PARTE 1: Pulizia del Codice, Ordinamento e Ottimizzazione

Questa fase mira a ottimizzare il consumo di risorse su Supabase (piano Free) e Vercel (limite di banda), migliorare la leggibilità del codice TypeScript e allineare tutti i componenti grafici allo standard di design system definito.

### 1.1 Ottimizzazioni per il piano Free di Vercel (Banda e Caricamento Iniziale)
- **Implementazione Lazy Loading (Code Splitting):**
  - Sostituire gli import statici delle pagine in `src/App.tsx` con import dinamici tramite `React.lazy` (es. `Dashboard`, `Athletes`, `Payments`, `Inventory`, `StaffTasks`, ecc.).
  - Avvolgere le rotte in un componente `<Suspense fallback={<Loading />} >` per migliorare i tempi di caricamento (LCP) e ridurre la banda sprecata sul server di deploy scaricando l'intero bundle al login.

### 1.2 Ottimizzazioni per il piano Free di Supabase (Chiamate API e Database)
- **Consolidamento query della Dashboard (RPC):**
  - In `src/pages/Dashboard.tsx`, sostituire le 5 chiamate API parallele (conteggio atleti attivi, scadenze visite mediche a 30gg/7gg, pagamenti in sospeso, atleti per settore) con una singola chiamata RPC (Remote Procedure Call) a una funzione Postgres custom (es. `get_dashboard_stats()`).
  - Creare la funzione SQL corrispondente su Supabase che restituisca un singolo payload JSON.
- **Creazione di Database Indexes:**
  - Creare indici mirati per velocizzare le query di filtro più frequenti:
    - `idx_players_is_active` su `players(is_active)`
    - `idx_players_medical_expiry` su `players(medical_expiry)`
    - `idx_payments_status` su `payments(status)`
  - Monitorare le performance post-indicizzazione.

### 1.3 Ordinamento, Standardizzazione e Risoluzione Debito Tecnico
- **Risoluzione Warning Linter e TypeScript:**
  - Standardizzazione dei tipi TypeScript e attivazione/risoluzione del linter per `verbatimModuleSyntax` in `tsconfig.json`.
  - Eliminazione dei warning "Do not use Array index in keys" rimasti in componenti o liste dinamiche, sostituendoli con chiavi univoche basate su ID del database.
  - Pulizia degli import inutilizzati e ordinamento degli stessi in tutti i file delle pagine (`src/pages/*.tsx`).
- **Allineamento Grafico "Premium Glass":**
  - Verificare che tutti i modali in `src/components/modals` siano allineati al design system bordeaux (`#800020`), oro/bianco, trasparenze glassmorfiche (`backdrop-blur`), angoli arrotondati (`rounded-xl` / `rounded-full`) e transizioni fluide.
  - Eseguire il refactoring di `ProfileModal.tsx` (attualmente placeholder elementare) e uniformarlo agli altri modali premium.
  - Pulizia o rimozione di file placeholder incompleti (es. `Attendance.tsx` se non strutturata).

---

## PARTE 2: Fase di Studio (Algoritmi, Pattern e Architettura)

Fase preliminare di analisi e prototipazione per definire l'architettura applicativa, la sicurezza dei dati e la logica di business complessa prima della scrittura del codice delle feature.

### 2.1 Pattern di Stato e Caching
- **Adozione di Zustand vs Context:**
  - Studiare la necessità di introdurre **Zustand** per lo stato globale client-side (es. gestione della sessione utente, preferenze del tema, stato del selettore della stagione sportiva globale in header).
- **Strategia di Invalidazione della Cache (TanStack Query):**
  - Definire le query key univoche per evitare conflitti o dati obsoleti.
  - Progettare le strategie di invalidazione automatica (es. dopo il salvataggio di un pagamento in `PaymentModal`, invalidare la cache di `Dashboard` e `Payments` per aggiornare istantaneamente grafici e contatori).

### 2.2 Sicurezza, Ruoli (RBAC) e RLS su Supabase
- **Progettazione delle Row Level Security (RLS) Policies:**
  - Definire il mapping esatto dei ruoli utente (`president`, `director`, `coach`, `player`, `parent`).
  - Analizzare le performance e la sicurezza delle RLS per garantire che:
    - L'**Allenatore** veda e modifichi SOLO i dati dei giocatori del proprio settore/leva (compreso lo stato di tesseramento).
    - Il **Giocatore/Genitore** veda SOLO il proprio profilo, scadenze e pagamenti (nessuna statistica di performance).
    - I **Dirigenti** e il **Presidente** abbiano accesso completo.
  - Studiare se salvare il ruolo all'interno dei custom user metadata di Supabase Auth o se gestirlo tramite una tabella di mapping `user_roles` con funzioni Postgres per l'integrazione con i JWT claims.

### 2.3 Architettura per Invio Email e Logiche Server-side
- **Integrazione Supabase Edge Functions + Resend:**
  - Progettare l'architettura per invocare in sicurezza l'invio di email massicce o automatiche (come i solleciti per le visite mediche in scadenza a 30 giorni).
  - Studiare l'implementazione del template email in HTML/CSS responsivo compatibile con i client di posta più diffusi.

### 2.4 Automazione della Logica "Scatto di Leva" e Storico Stagioni
- **Gestione del Cambio Stagione e Trascinamento Insoluti:**
  - Progettare lo schema DB per collegare gli atleti a più stagioni o per aggiornare la loro iscrizione alla stagione corrente.
  - Definire la logica di transazione PostgreSQL per:
    1. Aggiornare/creare l'associazione dell'atleta alla nuova stagione (mantenendo lo storico delle stagioni precedenti).
    2. Rilevare eventuali pagamenti non saldati (insoluti) della stagione precedente e trascinarli come "debito pregresso" nel profilo finanziario dell'atleta per la nuova stagione.
    3. Generare le nuove quote in base al listino della nuova stagione.

### 2.5 Infrastruttura di Deploy e CI/CD
- **Railway Deployment:**
  - Configurazione ottimale di Docker e Nginx per il routing client-side della SPA (risoluzione dei problemi di refresh 404).
  - Configurazione delle variabili d'ambiente di staging e produzione su Railway.

---

## PARTE 3: Definizione delle Feature da Implementare

Milestone per lo sviluppo delle funzionalità utente sul portale web e sulla dashboard gestionale.

### 3.1 Autenticazione e Profilo Utente
- **Completamento Area Personale:**
  - Implementazione del form di visualizzazione e aggiornamento dei dati del profilo in `ProfileModal` (in alto a destra).
  - Gestione del cambio password e preferenze del tema (Light/Dark mode).
- **Gestione Utenti e Ruoli (Admin Panel):**
  - Interfaccia per il Presidente per invitare membri dello staff, assegnare ruoli e disabilitare account.

### 3.2 Gestione Roster Atleti ed Anagrafica Avanzata
- **Rinnovo Stagionale Atleti Esistenti:**
  - Aggiungere una funzionalità per iscrivere/associare un vecchio atleta alla nuova stagione corrente, permettendo di aggiornare rapidamente i suoi dati senza doverlo reinserire da zero.
- **Gestione Numero Matricola per Nuovi Iscritti:**
  - Aggiungere il campo `registration_number` (Numero Matricola FIGC/Societario) nella tabella `players` e nei relativi modali di inserimento/modifica.
  - **Sistema di Notifica per Matricola Mancante:** Mostrare un alert/badge visibile sulla Dashboard o nella lista atleti per ricordare allo staff (Presidente/Dirigente) di assegnare il numero di matricola ai nuovi iscritti che ne sono sprovvisti.
- **Scheda Dettaglio Singolo Atleta:**
  - Creazione di una modale o pagina di dettaglio dell'atleta che includa:
    - Storico medico (visite passate).
    - Storico pagamenti (quote correnti, rate, scadenze e insoluti anno precedente).
    - Dati di tesseramento FIGC.

### 3.3 Registro Presenze e Allenamenti (Mobile-First)
- **Implementazione di `Attendance.tsx`:**
  - Vista ottimizzata per smartphone per gli allenatori a bordo campo.
  - Selezione della Leva/Squadra gestita.
  - Calendario degli allenamenti e griglia atleti con toggle rapido Presente / Assente / Giustificato.
  - Salvataggio dello storico sul database.

### 3.4 Dashboard Dedicate per Ruolo (RBAC Front-end)
- **Dashboard Allenatore (Coach Portal):**
  - Visualizzazione dell'elenco dei propri giocatori della Leva di competenza.
  - **Visualizzazione Stato Tesseramenti:** Permettere all'allenatore di vedere chiaramente se ciascun atleta è tesserato FIGC (`is_registered` = true/false) e se ha la visita medica in corso di validità.
  - Gestione convocazioni per le partite del weekend.
  - Tracking delle presenze medie degli atleti.
- **Portale Giocatore / Genitore (Player Portal):**
  - Vista semplificata in sola lettura.
  - Widget con avviso in tempo reale se la visita medica è in scadenza.
  - Stato dei pagamenti delle quote e delle singole rate correnti (più eventuali insoluti pregressi).

### 3.5 Gestione Finanziaria, Quote e Rateizzazione
- **Supporto Pagamenti Multi-Rata:**
  - Permettere all'amministratore di suddividere la quota annuale di un atleta in più rate (es. 2, 3 o più rate con scadenze personalizzate).
  - Tracciamento dello stato di ciascuna rata (Pagata, Scaduta, Parziale, In attesa).
- **Gestione Insoluti Anno Precedente:**
  - Visualizzazione e conteggio del debito pregresso nel bilancio finanziario dell'atleta.
  - Possibilità di registrare pagamenti specifici destinati a sanare gli insoluti dell'anno precedente.

### 3.6 Esportazione Dati e Reportistica
- **Esportazione in Excel (.xlsx):**
  - Integrare la libreria SheetJS (`xlsx`) per esportare le tabelle atleti, pagamenti e presenze filtrati in formato Excel con stili tabellari leggibili.
- **Grafici Finanziari e di Roster:**
  - Integrare Recharts per mostrare grafici di andamento dell'incassato (compreso il recupero insoluti e le rate future) rispetto al previsto.

---

## 4. Sviluppi Futuri (Deferred / Fuori Portata Immediata)
* **Modulo Magazzino e Materiale Sportivo (Kit Vestiario):** Rimandato a fasi successive. La gestione avanzata dell'inventario e l'assegnazione dei kit agli atleti non fa parte della release corrente.
* **Statistiche di Performance dei Giocatori:** Non viene registrata alcuna statistica individuale di performance (gol, assist, passaggi, ecc.) per i singoli atleti.
