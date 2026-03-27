# Changelog

Tutti i cambiamenti significativi al progetto Pro Pontedecimo saranno documentati in questo file.

## [0.5.0] - 2026-03-27

### Aggiunto
- **Modulo Staff Tasks**: Interfaccia glassmorphic per la gestione delle attività societarie.
- **Service Layer Staff**: Integrazione con Supabase per CRUD task e gestione profili.
- **Modale AddTask**: Form per la creazione di nuove task con assegnazione automatica `created_by`.
- **Modale AddAthlete**: Integrazione per l'aggiunta di nuovi tesserati.
- **Modale AddInventory**: Gestione inserimento articoli magazzino con validazione.

### Corretto
- Risolti critici errori di sintassi in `Athletes.tsx` che impedivano la build.
- Corretta gestione degli import `useState` e hook di React mancanti.
- Sistemati i warning del linter "Do not use Array index in keys" in tutte le pagine principali.
- Ottimizzata la gestione dei tipi TypeScript nel service layer.
- Migliorata la consistenza grafica (stondature, trasparenze, effetti glass) su Atleti e Magazzino.

### Modificato
- Refactoring `AuthContext` per esporre correttamente l'ID utente per il tracciamento creazioni.
- Aggiornato `AI/agent.md` con nuove policy su branching (no-delete) e versionamento.
