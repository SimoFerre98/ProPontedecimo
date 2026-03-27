# Changelog

Tutti i cambiamenti significativi al progetto Pro Pontedecimo saranno documentati in questo file.

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
