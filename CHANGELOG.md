# Changelog

Tutti i cambiamenti significativi al progetto Pro Pontedecimo saranno documentati in questo file.

## [0.1.0-alpha.1] - 2026-03-27

### Aggiunto
- **Modulo Visite Mediche**: Gestione completa dei certificati medici con calcolo automatico della validità e filtri per settore.
- **Modulo Magazzino**: Interfaccia per il tracciamento delle scorte (kit, attrezzature, premi) con azioni rapide di aggiornamento quantità.
- **Navigazione Dashboard**: Implementata navigazione client-side fluida utilizzando `react-router-dom` `Link`.
- **Hamburger Menu**: Menu flottante interattivo per una migliore esperienza mobile e desktop.
- **Design Glassmorfico**: Estetica premium con trasparenze, effetti di luce e componenti "pill".

### Corretto
- **Import date-fns**: Risolto errore di risoluzione in Vite 8 utilizzando percorsi di importazione diretti per ogni funzione.
- **Icone Lucide**: Uniformata la libreria di icone e risolti i conflitti di visualizzazione nella Dashboard.
- **SonarQube Lints**: Rifattorizzate ternarie annidate e migliorata la gestione delle chiavi nelle liste (evitando array index).

### Migliorato
- **Dashboard Stats**: Visualizzazione dinamica e stile armonizzato per tutte le StatCard.
- **UX**: Aggiunte animazioni di transizione `framer-motion` tra le rotte e feedback visivi sugli elementi interattivi.
