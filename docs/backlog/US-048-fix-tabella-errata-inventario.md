# US-048: Fix tabella errata in inventoryService

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** HIGH | **Story Points:** 1 | **Scope:** MVP

**Story**
Come utente della pagina Magazzino,
voglio che le operazioni su articoli inventario funzionino,
così che la pagina non fallisca sistematicamente ogni volta che leggo, aggiungo o aggiorno un articolo.

**Demonstrates**
After implementing this story, the user can: aprire la pagina Magazzino e vedere l'elenco articoli caricarsi correttamente, aggiungere un nuovo articolo e aggiornarne la quantità, senza errori.

**Acceptance Criteria**
- [ ] `inventoryService.getInventory` interroga la tabella `inventory_items` (non `inventory`) e la pagina Magazzino mostra correttamente l'elenco articoli
- [ ] `inventoryService.addItem` inserisce in `inventory_items`
- [ ] `inventoryService.updateQuantity` aggiorna `inventory_items`
- [ ] Verifica manuale end-to-end sulla pagina Magazzino: caricamento lista, creazione articolo, modifica quantità, tutti senza errori in console/network tab

**Context**
Emerso durante la verifica manuale di US-036 (2026-07-16): il flusso di errore di `AddInventoryModal` si è manifestato naturalmente durante il test perché `src/services/inventoryService.ts` interroga la tabella `inventory` in tutti e tre i suoi metodi (`getInventory`, `addItem`, `updateQuantity`), mentre lo schema Postgres (`supabase/migrations/20260704154518_baseline_schema.sql`) definisce la tabella come `inventory_items`. La tabella `inventory` non esiste: ogni chiamata al service fallisce.

Non era stato corretto in quel branch perché fuori perimetro rispetto a US-036 (solo la migrazione all'hook `useFormModal`); segnalato lì come bug preesistente da tracciare separatamente.

Impatto: la pagina Magazzino (`src/pages/Inventory.tsx`) è oggi verosimilmente non funzionante in nessun flusso (lettura, creazione, aggiornamento quantità), perché ogni query fallisce a livello Postgres (tabella inesistente).

**Status:** TODO
**Plan:** —
