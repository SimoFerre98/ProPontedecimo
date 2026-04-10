# Changelog

Tutti i cambiamenti significativi al progetto Pro Pontedecimo saranno documentati in questo file.
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
