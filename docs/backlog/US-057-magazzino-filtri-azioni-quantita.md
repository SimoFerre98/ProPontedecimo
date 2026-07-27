# US-057: Magazzino — filtri categoria navigabili, azioni articolo e fix quantità

**Epic:** EP-016 — Gestione Magazzino | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** MVP

**Story**
Come president/director che gestisce il Magazzino,
voglio poter navigare le categorie anche quando sono tante, modificare o eliminare un articolo già inserito e non vedere artefatti nel campo quantità,
così che la pagina sia realmente utilizzabile per la gestione quotidiana del materiale, non solo per l'inserimento iniziale.

**Demonstrates**
After implementing this story, the user can: scorrere/filtrare le categorie del Magazzino anche con un elenco lungo senza che la barra di ricerca ne risenta, aprire un articolo esistente dal bottone Azioni per modificarne nome/categoria/unità/stock minimo o eliminarlo, e digitare una quantità nel form di creazione senza ritrovarsi uno zero iniziale indesiderato (es. "02").

**Acceptance Criteria**
- [ ] La barra categorie in [Inventory.tsx](../../src/pages/Inventory.tsx) resta pienamente navigabile con molte categorie: aggiungere un'indicazione visibile di scroll (frecce o fade ai bordi) invece dello scroll nascosto attuale (`no-scrollbar`), senza restringere la barra di ricerca sotto una soglia utilizzabile
- [ ] Il bottone "Azioni" (freccia) nella tabella articoli apre un modale di dettaglio/modifica articolo invece di non fare nulla
- [ ] Aggiunta `inventoryService.updateItem` e `inventoryService.deleteItem` (oggi assenti), con modale di modifica/eliminazione riservato a `president`/`director` — coerente con la policy RLS `inventory_all_admin` già esistente; il ruolo `coach` (sola lettura via `inventory_select_coach`) non deve vedere queste azioni
- [ ] Il form di creazione articolo ([AddInventoryModal.tsx](../../src/components/modals/AddInventoryModal.tsx)) non mostra più "02" digitando "2" nel campo quantità (default vuoto o selezione del contenuto al focus, invece dello stato iniziale `0` visibile)
- [ ] Verifica manuale: creazione, modifica ed eliminazione di un articolo, con più di una schermata di categorie, senza errori console/network

**Context**
Analisi del codice (2026-07-27) ha confermato quattro problemi distinti segnalati dall'utente durante l'uso reale della pagina Magazzino:
1. La barra categorie ([Inventory.tsx:111](../../src/pages/Inventory.tsx)) è un flex item senza `shrink-0`: con molte categorie si schiaccia a favore della search bar (`flex-1`) e nasconde lo scroll aggiuntivo dietro `no-scrollbar`, rendendolo non scopribile.
2. Il bottone "Azioni" ([Inventory.tsx:223-227](../../src/pages/Inventory.tsx)) è puramente visivo, senza `onClick`.
3. `inventoryService.ts` espone solo `getInventory`, `addItem`, `updateQuantity`: non esiste modifica/eliminazione di un articolo esistente.
4. `AddInventoryModal.tsx` inizializza `quantity: 0` come stato numerico visibile nel campo: digitando senza selezionare prima lo zero esistente si ottiene "02".

Il campo `min_stock` (introdotto in US-048) **non** è invece un bug: è già usato attivamente per la statistica "In Esaurimento" e per il badge di stato riga, quindi va preservato as-is nel modale di modifica.

Questa è la prima story dedicata al modulo Magazzino oltre al fix di US-048 (EP-014): si introduce l'epica EP-016 per raccogliere le prossime story su questo modulo, distinto dal debito tecnico generico di EP-014.

**Status:** TODO
