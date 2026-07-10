# Changelog

Tutti i cambiamenti significativi al progetto Pro Pontedecimo saranno documentati in questo file.

## [Unreleased]

### Added
- **US-016**: Aggiunto supporto al trascinamento degli insoluti della stagione precedente come "debito pregresso" all'avvio della nuova stagione.
- **US-016**: Estesa la RPC `create_season_from_wizard` per collegare gli atleti importati tramite `previous_player_id` e calcolare/inserire automaticamente il debito pregresso (riga `payments` con `plan = 'carried_over'`) per gli atleti con rate `pending` residue.
- **US-016**: Corretta la RPC `create_payment_plan` per escludere le righe `carried_over` dalla sovrascrittura/cancellazione del piano, dal blocco delle modifiche se già pagate, e dalla numerazione `installment_no` (che riparte dopo il debito pregresso).
- **US-016**: Estesi gli script di test `test-rpc-wizard.mjs` e `test-payment-plan.mjs` per validare l'integrazione e la coesistenza del debito pregresso.
- **US-016**: Aggiornati i tipi TS in `src/types/database.ts` e `paymentService.ts` per includere `previous_player_id` e il valore `'carried_over'` per `PaymentPlan`.
- **US-016**: Aggiunta la card statistica "Debito Pregresso" in `PlayerPaymentSummaryModal.tsx` ed etichetta dedicata sia in `PlayerPaymentSummaryModal` che in `Payments.tsx`.
- **US-015**: Aggiunto supporto completo ai pagamenti rateizzati multi-rata personalizzabili, consentendo all'amministrazione di definire importi e scadenze arbitrarie.
- **US-015**: Creata la RPC database `create_payment_plan` in transazione atomica per salvare o sovrascrivere un piano rate per atleta+stagione, validando la somma ed evitando modifiche se esistono già rate pagate.
- **US-015**: Riscritto `NewPaymentModal.tsx` come editor dinamico per piani rate (stepper 1-12 rate, divisione equa automatica/manuale, e indicatore visivo di bilanciamento live della quota).
- **US-015**: Creato il nuovo componente `PlayerPaymentSummaryModal.tsx` per visualizzare il riepilogo finanziario dell'atleta (quota totale, pagato, residuo) e l'elenco rate evidenziando quelle scadute e non pagate.
- **US-015**: Integrato il trigger per il riepilogo pagamenti in `Athletes.tsx` (in vista griglia e tabella).
- **US-015**: Creato lo script di test di integrazione database `test-payment-plan.mjs` che valida l'autorizzazione, la somma e il blocco delle sovrascritture su rate già saldate.
- **US-014**: Aggiunto feed iCal (.ics) personale e revocabile per sincronizzare gli eventi societari e le partite su Google Calendar, Apple Calendar o Outlook.
- **US-014**: Creata la migrazione SQL per aggiungere `ics_token` alla tabella `profiles` e la funzione `regenerate_ics_token` in modalità SECURITY INVOKER per rigenerare/revocare in modo sicuro il token personale.
- **US-014**: Sviluppato un serializzatore iCal RFC 5545 puro in TypeScript (`_shared/ics.ts`) che gestisce il folding delle righe a 75 caratteri, l'escape dei caratteri e la formattazione dei dettagli partita (ritrovo + inizio gara).
- **US-014**: Creata l'Edge Function pubblica `ics-feed` che risolve il token via service role, recupera gli eventi e risponde con `text/calendar`, protetta da validazione del token UUID e con intestazioni CORS e Cache-Control per evitare memorizzazioni locali.
- **US-014**: Integrazione dell'UI nel `ProfileModal.tsx` con la sezione "Sincronizza Calendario" che consente l'attivazione della sincronizzazione, la copia rapida del link negli appunti, la rigenerazione immediata (revoca) e lo stato di caricamento.
- **US-014**: Creato lo script di test di integrazione end-to-end `test-ics-feed.mjs` che valida il ciclo di vita del token (generazione, invalidazione, 404 per token errati) e la conformità del feed iCal generato.
- **US-012**: Creato il modulo `src/lib/dateTime.ts` contenente le funzioni pure `combineLocalDateTime` e `splitLocalDateTime` per la gestione corretta dei datetime rispetto alla timezone locale del browser.
- **US-012**: Integrazione degli helper di datetime in `TaskModal.tsx` e `calendarService.ts` per allineare l'inserimento/visualizzazione dei compiti del calendario ed evitare disallineamenti di fuso orario (offset UTC).
- **US-012**: Parsing sicuro della data di scadenza delle visite mediche (`medical_expiry`) per scongiurare slittamenti di data dovuti al parsing UTC.
- **US-012**: Nuovi script di test d'integrazione `test-datetime-helpers.mjs` (verifica round-trip e orari limite) e `test-calendar-timezone.mjs` (round-trip database end-to-end).
- **US-011**: Nuovo filtro `registrationStatus` a livello di `athleteService.getPlayers` e tipo `FiltersState` in `Athletes.tsx` per filtrare gli atleti con matricola mancante.
- **US-011**: Nuovo metodo `athleteService.getMissingRegistrationCount` per conteggiare gli atleti attivi senza matricola.
- **US-011**: Banner condizionale "Matricola Mancante" in `Athletes.tsx` (stile amber, con applicazione del filtro al click).
- **US-011**: Script di test di integrazione `test-registration-missing.mjs` che valida il filtro e il conteggio con ripristino automatico.
- **US-010**: Visualizzazione del numero di matricola FIGC nella vista tabella e vista card della pagina `Athletes.tsx`.
- **US-009**: Trigger database PostgreSQL `validate_player_fields` e trigger `trg_validate_player_fields` BEFORE INSERT OR UPDATE per impedire il salvataggio di atleti con dati obbligatori incompleti o formati codice fiscale non validi.
- **US-009**: Script di test di integrazione del database `test-validation-trigger.mjs` che convalida i vincoli del trigger lato server.
- **US-009**: Validazione frontend reattiva nel modale `AddAthleteModal.tsx` con stato degli errori reattivo in italiano, validazione codice fiscale conforme al database e blocco del pulsante di salvataggio.
- **US-009**: Feedback visivo e UX in `AddAthleteModal.tsx` con bordi rossi per i campi non validi, messaggi d'errore localizzati in italiano, e pallini rossi pulsanti sui tab delle sezioni con errori.
- **US-008**: Funzione RPC database `create_season_from_wizard(p_name text, p_start_date date, p_end_date date, p_players jsonb)` per la creazione atomica della nuova stagione, lo switch di stato `is_active` e la copia selettiva/dedup degli atleti con scatto di leva e regole di copia specifiche.
- **US-008**: Utility pura `suggestLeva` in `src/lib/leva.ts` con mapping fasce d'età FIGC parametrizzato sull'anno di inizio stagione.
- **US-008**: Nuovo modale multi-step `NewSeasonWizardModal.tsx` con stepper e layout fedele ai mockup per gestire i 4 step (dati, selezione atleti, scatto di leva/creazione leve, riepilogo e conferma).
- **US-008**: Wrapper client-side `createSeasonFromWizard` in `seasonService.ts` e parametrizzazione `seasonId` su `getUniqueSectors` in `athleteService.ts`.
- **US-007**: Store globale `useAppStore` (Zustand) con persistenza per gestire `seasons`, `theme` e `auth` (in sola lettura).
- **US-007**: Nuovo servizio `seasonService.ts` per recuperare le stagioni dal database e individuare quella attiva.
- **US-007**: Aggiunto parametro opzionale `seasonId` alle funzioni `getPlayers` e `getPayments` nei rispettivi servizi.

### Interfaccia
- **US-008**: Modificato il dropdown stagioni in `DashboardLayout.tsx` per consentire l'apertura anche con una sola stagione per i ruoli admin e aggiunto il pulsante "+ Nuova stagione" nel footer del menu per avviare il wizard.
- **US-007**: Refactoring del dropdown stagioni in `DashboardLayout.tsx` per rimuovere l'array hardcoded, integrarlo con lo store Zustand e il db.
- **US-007**: Aggiornate `Dashboard.tsx`, `Athletes.tsx` e `Payments.tsx` per ascoltare i cambiamenti di stagione nello store e aggiornare le query di React Query.

### Modificato
- **US-007**: Migrato `AuthProvider` per sincronizzare il profilo utente con `useAppStore`.
- **US-007**: Migrazione SQL per la funzione `get_dashboard_stats`: aggiunto parametro `p_season_id` con fallback automatico sulla stagione attiva.

## [0.13.0] - 2026-07-06

### Added
- **US-006**: Aggiunte Supabase Edge Functions per invio email (`send-email` e `medical-reminders`).
- **US-006**: Template grafico brandizzato (bordeaux/oro) per email e promemoria visite mediche (`_shared/templates.ts`).
- **US-006**: Documentazione architettura in `docs/edge-functions.md` per l'invio email e il setup segreti.

### Interfaccia
- **Modali allineati allo stile Premium Glass (US-005)**: overlay canonico `bg-background/60 backdrop-blur-xl` e pulsante di chiusura pill uniforme su tutti gli 11 modali; scala dei raggi normalizzata.
- **ProfileModal reale**: sostituito il placeholder con il modale "Il Mio Profilo" (avatar/iniziali, nome, email, badge ruolo, data registrazione) in sola lettura, fedele al mockup approvato; pulsante "Modifica Profilo" disabilitato (editing in US-018).
- **Responsive**: aggiunti vincoli viewport e scroll interno a `DeleteAthleteModal`, `NewPaymentModal`, `PaymentModal`.
- **Fix typo**: corretta la classe inesistente `NOT-italic` -> `not-italic` in 5 file (CalendarModal, TaskModal, MedicalVisitModal, AddInventoryModal, Athletes, Inventory, StaffTasks, TaskTimeline).

## [0.12.2] - 2026-07-05

### Qualità
- **Zero warning linter e TypeScript (US-004)**: risolti tutti i 26 problemi ESLint (14 `any` espliciti sostituiti con tipi reali, variabili inutilizzate, dipendenze `useMemo`/`useEffect`, regole `react-refresh` e `react-hooks/set-state-in-effect`), senza alcuna soppressione.
- **Refactoring auth**: hook `useAuth` estratto in `src/hooks/useAuth.ts` e context in `src/contexts/auth-context.ts` (Fast Refresh conforme); `buttonVariants` estratto in `button-variants.ts`.
- **SettingsModal**: caricamento utenti migrato a TanStack Query con update ottimistici via cache (`setQueryData`).
- **CalendarEvent**: tipo ridefinito come unione discriminata (`task`/`medical`) con `originalData` tipizzato.

## [0.12.1] - 2026-07-05

### Prestazioni
- **Indici database (US-003)**: aggiunti `idx_players_is_active` e `idx_players_medical_expiry` per i filtri delle liste atleti (`idx_payments_status` era già presente dalla baseline). Verificato con `EXPLAIN (ANALYZE)` sul cloud; matrice RLS rieseguita come non-regressione (23/23).

## [0.12.0] - 2026-07-05

### Sicurezza
- **RLS per tutti i ruoli (US-002)**: chiuse tre falle della baseline — escalation di privilegio su `profiles.role` (chiunque poteva auto-promuoversi via API), policy coach senza filtro squadra (vedeva tutti gli atleti e tutti i pagamenti), ruolo parent privo di policy.
- **Anti-escalation**: trigger `trg_enforce_role_change` — solo il Presidente può modificare i ruoli utente.
- **Nuove associazioni**: tabelle `coach_teams` (leve per allenatore) e `parent_players` (figli per genitore) con RLS dedicate.
- **Matrice di accesso verificata**: nuovo script `scripts/test-rls.mjs` (20 controlli sui 5 ruoli + anonimo, con utenti di prova e cleanup automatico).

## [0.11.0] - 2026-07-04

### Aggiunto
- **Supabase CLI e Migrazioni Versionate (US-001)**: la CLI è ora una devDependency con script npm dedicati (`db:new`, `db:pull`, `db:push`, `db:diff`, `db:list`); lo schema del database è versionato in `supabase/migrations/`.
- **Migrazione Baseline**: `20260704154518_baseline_schema.sql` fotografa l'intero schema di produzione (9 tabelle, funzioni incluse `get_dashboard_stats`, 27 policy RLS), incluso il trigger `on_auth_user_created` su `auth.users` non coperto dal dump automatico.
- **Documentazione Database**: nuova guida `docs/database.md` con setup al primo clone, flusso delle migrazioni e nota sul session pooler IPv4.

### Modificato
- **Archiviazione script manuali**: `supabase/migrations/payments_update.sql` spostato in `scripts/sql-archive/` (già applicato al cloud, catturato dalla baseline).
- **Migration history remota**: riparate 14 voci orfane del setup iniziale (marzo-aprile 2026) marcandole come `reverted`; la history riparte dalla baseline.
- `.gitignore` aggiornato con gli artefatti locali della CLI (`supabase/.temp/`).

## [0.10.0] - 2026-04-10

### Aggiunto
- **Supporto Orario**: Introdotta la possibilità di specificare l'ora di inizio e fine per ogni task (formato 24h).
- **Multi-day Tasks**: Il calendario ora visualizza correttamente i task che si sviluppano su più giorni.
- **Visualizzazione Calendario**: Gli orari dei task sono ora visibili direttamente nel titolo dell'evento nel calendario.

### Modificato
- **Flessibilità Task**: La data di fine è ora opzionale; i task vengono creati per un singolo giorno di default.
- **UI Professionale**: Sostituito l'alert di sistema con un modale professionale (`MedicalVisitModal`) per la gestione delle visite mediche direttamente dal calendario.

### Corretto
- **Migrazione Database**: Convertite le colonne delle date in `timestamptz` per supportare correttamente l'orario e risolvere l'errore di salvataggio.
- **Sincronizzazione Timezone**: Risolto il problema dello slittamento dei task (offset) tra mesi e giorni diversi nel calendario.

## [0.9.0] - 2026-04-10

### Aggiunto
- **Configurazione Vercel**: Creato `vercel.json` per gestire il client-side routing (rewrites) e prevenire errori 404 al ricaricamento della pagina.
- **Sistema di Notifiche Stateless**: Implementato calcolo real-time di avvisi per visite mediche in scadenza e task scaduti.
- **Badge Notifiche**: Aggiornato il layout con campanella dinamica e dropdown interattivo.

### Corretto
- **Robustezza Supabase**: Aggiunto controllo esplicito sulle variabili d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` con logging di errore dettagliato.
- **Sincronizzazione Contatori**: Fix invalidazione cache dopo l'aggiornamento di una visita medica; ora i badge delle statistiche e le notifiche si aggiornano istantaneamente.
- **Pulsante Filtri Mobile**: Garantita la visibilità del pulsante filtri su schermi ridotti in `AthletesPage`.

## [0.8.1] - 2026-04-10

## [0.8.0] - 2026-04-05

### Aggiunto
- **Campo Tesseramento FIGC** (`is_registered`): Nuova colonna `boolean` nella tabella `players` per tracciare se un atleta è tesserato federalmente. Distingue il tesseramento dallo stato "In Rosa" (attivo in squadra).
- **Toggle Tesserato nel Modale Atleta**: Card interattiva con toggle nella sezione "Sport" del modale `AddAthleteModal`. Verde = Tesserato FIGC, Ambra = Non Tesserato. Visibile in fase di iscrizione e modifica.
- **Filtri Avanzati Atleti**: Pannello filtri espandibile nella sezione Atleti con 4 dimensioni di filtraggio:
  - *Stato Squadra*: Tutti / In Rosa / Ritirati
  - *Tesseramento FIGC*: Tutti / Tesserati / Non Tesserati
  - *Visita Medica*: Tutte / Valida / Scaduta / Mancante
  - *Ordina Per*: Cognome A→Z / Ultimi Iscritti / Scadenza Medica (con toggle asc/desc)
- **Chip filtri attivi**: Mostrati sotto la toolbar con possibilità di rimozione singola.
- **Badge duplici sulle card atleta**: Ogni card mostra ora sia lo stato squadra ("In Rosa"/"Ritirato") che il tesseramento ("Tesserato"/"Non Tess.") con colori differenziati.
- **Colonna Tesserato in vista tabella**: Aggiunta colonna dedicata con badge colorato nella vista lista.
- **Stato vuoto intelligente**: Messaggio dedicato quando nessun atleta corrisponde ai filtri attivi, con pulsante "Azzera Filtri".
- **Allarme scadenza medica**: Nelle card atleta, le visite scadute appaiono evidenziate in rosso.
- **Ricerca estesa**: Ora la ricerca per nome/cognome include anche il codice fiscale.
- **Ordinamento server-side**: `athleteService.getPlayers` supporta ora parametri `sortBy` e `sortDir` con query Supabase.

### Modificato
- **Semantica `is_active`**: Rinominato da "Attivo/Inattivo" a **"In Rosa / Ritirato"** per maggiore chiarezza operativa. Un atleta "In Rosa" partecipa attivamente; "Ritirato" è fuori rosa ma conservato in archivio.
- **Statistiche header Atleti**: Aggiornate da 3 a 4 card:  Totale In Rosa · Tesserati FIGC · Settori · Visite Scadute.
- **Modali più grandi e accessibili**: Tutti i modali usano ora `w-[95vw]` con `max-h-[96vh]` per massimizzare la leggibilità su qualsiasi schermo. Header e padding aumentati (`p-8`, testo `text-2xl`).
- **Chiusura click-fuori**: Pannelli Notifiche, Impostazioni e Profilo ora si chiudono cliccando fuori dall'area.
- **Selettore Stagione nell'header**: Aggiunto menu a tendina per la selezione della stagione sportiva (UI placeholder, pronto per integrazione backend).
- **Icona Notifiche nell'header**: Aggiunta campanella con badge (UI placeholder, pronto per integrazione backend).
- **Logo header ingrandito**: Logo Pro Pontedecimo aumentato per maggiore visibilità (`w-12 h-12`).

### Corretto
- Rimosso import inutilizzato `Shield` da `SettingsModal.tsx`.
- Aggiunto `role="presentation"` e `onKeyDown` ai div backdrop del selettore stagione per conformità accessibilità.

## [0.7.0] - 2026-04-03

### Aggiunto
- **FilterToolbar Universale**: Nuovo componente `FilterToolbar` introdotto nelle sezioni Atleti e Visite Mediche con barra di ricerca a comparsa (animazione) e controlli scroll orizzontali.
- **Conteggi Visite Globali**: Ora le statistiche nella dashboard delle Visite Mediche sono calcolate tramite `medicalService.getMedicalStats` prendendo i dati reali a livello globale di società, indipendentemente dalla paginazione locale.

### Corretto
- Risolti bug legati all'aggiornamento dei ruoli in `SettingsModal` (implementata proper Supabase Policy per amministratori e aggiunto mapping per ruolo Parent).
- Risolto errore database `23502` durante l'inserimento di nuovi atleti (auto fetch di `season_id` se mancante).
- Aggiornato selector della leva con pre-fetch dinamico dal database (`getUniqueSectors`).
- Pulizia globale di warning TypeScript e organizzazione degli import in `Athletes.tsx` e `MedicalVisits.tsx`.

## [0.6.0] - 2026-03-27

### Aggiunto
- **Global Server-Side Pagination**: Implementata paginazione nativa Supabase in tutti i moduli (Atleti, Visite Mediche, Magazzino, Pagamenti).
- **Componente Reusable Pagination**: Creato `<Pagination />` con design glassmorphic e integrazione React Query.
- **Barre di Ricerca XL**: Ingrandite e rese più leggibili (`h-16`, `text-xl`) in tutte le pagine principali.
- **Refactoring Modali Premium**: Aggiornati `AddAthleteModal`, `AddInventoryModal` e `AddTaskModal` allo stile standard "Premium Glass".

### Modificato
- **UI Accessibility (Light Mode)**: Revisione completa di tutti i componenti per garantire perfetta visibilità in modalità chiara (rimozione hardcoded `text-white`).
- **Refactoring Service Layer**: Aggiornati tutti i servizi per restituire la struttura `{ data, count }`.
- **Query Keys**: Ottimizzate le chiavi di cache di React Query per includere `page`, `search` e `filters`.

### Corretto
- Risolti errori TypeScript e avvisi del linter (ternari annidati, array index keys).
- Corretti import mancanti (`supabase`) e named/default imports errati.
- Ottimizzata la gestione dei tipi TypeScript nel service layer.

## [0.5.1] - 2026-03-27

### Aggiunto
- **Integrazione Modale Atleti**: Collegato `AddAthleteModal` in `Athletes.tsx` con mapping completo dei campi DB.
- **Integrazione Modale Magazzino**: Collegato `AddInventoryModal` in `Inventory.tsx`.
- **UI/UX Enhanced**: Barra di ricerca ingrandita (h-16), font-size aumentato e contrasto migliorato per massima leggibilità.
- **Accessibilità**: Aggiunti attributi `id` e `htmlFor` a tutti i campi di input dei modali.

### Corretto
- Risolti errori di tipo in `Athletes.tsx` relativi a React Query e all'oggetto `Player`.
- Corretti import errati e typo (`hramer-motion` → `framer-motion`).
- Rimossi avvisi "Do not use Array index in keys" sostituiti con chiavi stabili basate sugli ID del database.
- Centralizzata la logica di fetching in `inventoryService.ts` (`getInventory`).

## [0.5.0] - 2026-03-27

### Aggiunto
- **Modulo Staff Tasks**: Interfaccia glassmorphic per la gestione delle attività societarie.
- **Service Layer Staff**: Integrazione con Supabase per CRUD task e gestione profili.
- **Modale AddTask**: Form per la creazione di nuove task con assegnazione automatica `created_by`.

### Corretto
- Risolti critici errori di sintassi in `Athletes.tsx` che impedivano la build.
- Corretta gestione degli import `useState` e hook di React mancanti.
- Sistemati i warning del linter "Do not use Array index in keys" in tutte le pagine principali.
- Ottimizzata la gestione dei tipi TypeScript nel service layer.
- Migliorata la consistenza grafica (stondature, trasparenze, effetti glass) su Atleti e Magazzino.

### Modificato
- Refactoring `AuthContext` per esporre correttamente l'ID utente per il tracciamento creazioni.
- Aggiornato `AI/agent.md` con nuove policy su branching (no-delete) e versionamento.
