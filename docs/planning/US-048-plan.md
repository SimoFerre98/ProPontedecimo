# US-048: Fix tabella errata in inventoryService — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-25

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** HIGH | **Story Points:** 1

**Story**
Come utente della pagina Magazzino, voglio che le operazioni su articoli inventario funzionino, così che la pagina non fallisca sistematicamente ogni volta che leggo, aggiungo o aggiorno un articolo.

**Criteri di Accettazione**
- [ ] `inventoryService.getInventory` interroga la tabella `inventory_items` (non `inventory`) e la pagina Magazzino mostra correttamente l'elenco articoli
- [ ] `inventoryService.addItem` inserisce in `inventory_items`
- [ ] `inventoryService.updateQuantity` aggiorna `inventory_items`
- [ ] Verifica manuale end-to-end sulla pagina Magazzino: caricamento lista, creazione articolo, modifica quantità, tutti senza errori in console/network tab

---

## Soluzione Tecnica

Il bug reale è più ampio di un semplice nome tabella sbagliato: lo schema Postgres di `inventory_items` (`supabase/migrations/20260704154518_baseline_schema.sql:239-248`) definisce solo `id, name, category (enum inventory_category: kit/equipment/trophy/other), quantity, notes, created_at, updated_at`, mentre `inventoryService.ts`, `Inventory.tsx` e `AddInventoryModal.tsx` presumono anche `unit`, `min_stock`, `status` e `last_update`, e inviano `category` come testo libero contro una colonna enum a 4 valori fissi. Correggere solo il nome della tabella lascerebbe `addItem`/`updateQuantity` a fallire comunque per colonne inesistenti. La soluzione porta quindi lo schema al livello già presunto dal codice esistente (deciso con l'utente in sessione di planning, tra le alternative valutate sotto), poi corregge il riferimento tabella nel service. Nessuna modifica è necessaria a `Inventory.tsx` o `AddInventoryModal.tsx`: sono già scritti per lo schema target.

- Nuova migrazione che allinea `inventory_items` ai campi usati dal frontend: `ALTER COLUMN category TYPE text` (poi `DROP TYPE inventory_category`, non usato altrove nella baseline), `ADD COLUMN unit text NOT NULL DEFAULT 'pz'`, `ADD COLUMN min_stock integer NOT NULL DEFAULT 5 CHECK (min_stock >= 0)`, `RENAME COLUMN updated_at TO last_update`.
- `src/services/inventoryService.ts`: sostituire i tre `.from('inventory')` con `.from('inventory_items')` in `getInventory`, `addItem`, `updateQuantity` — con lo schema allineato, nessun'altra modifica al service è necessaria.
- Nuovo script di integrazione `scripts/test-inventory.mjs` (pattern `scripts/test-payment-plan.mjs`): copre lettura/scrittura reali contro Supabase locale e il confine di ruolo RLS (`inventory_all_admin` per president/director, `inventory_select_coach` solo in lettura), colmando l'assenza totale di coverage che ha lasciato il bug invisibile.

**Alternativa valutata e scartata:** adattare service e UI allo schema minimale esistente (solo `name, category enum, quantity, notes, updated_at`), eliminando `unit`/`min_stock`/`status` dalla pagina Magazzino e trasformando il campo categoria del modale in una select con i 4 valori enum. Tecnicamente più "pulita" perché non richiede migrazione, ma trasforma una story da 1 punto in una modifica di UI/UX visibile (rimozione di colonne e concetti già presenti nell'interfaccia), a fronte dello stesso bug da risolvere. Scartata su indicazione esplicita dell'utente in sessione di planning, a favore di estendere lo schema mantenendo la UI attuale invariata.

---

## Strategia di Test

Il progetto non ha oggi alcuna copertura automatica su `inventory_items` — condizione che ha permesso al bug di restare non rilevato. La strategia combina un test di integrazione reale con la verifica manuale già richiesta dall'AC #4:

- **Integrazione (`scripts/test-inventory.mjs`):** `getInventory` restituisce gli articoli inseriti, con filtro `search` e `category` funzionanti; `addItem` inserisce una riga in `inventory_items` con tutte le colonne (incluse `unit`, `min_stock`); `updateQuantity` aggiorna `quantity` e `last_update`.
- **RLS:** un utente con ruolo `president`/`director` può inserire e aggiornare; un utente `coach` può solo leggere (nessun insert/update permesso da `inventory_select_coach`).
- **Regressione cross-story:** eseguire `npm run test:integration` per intero (non solo la nuova suite), a conferma che il rename `updated_at → last_update` e il cambio tipo di `category` non intacchino altre suite — nessuna story della lista "Superfici condivise" tocca `inventory_items`, quindi il rischio atteso è basso ma va verificato.
- **Manuale end-to-end (AC #4):** sulla pagina Magazzino con `npx supabase db reset` applicato — caricamento lista senza errori in console/network, creazione di un nuovo articolo tramite `AddInventoryModal`, modifica della quantità, tutto senza errori.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione schema `inventory_items` | Nuova migrazione: `category` da enum a `text` (+ `DROP TYPE inventory_category`), aggiunta `unit`/`min_stock`, rename `updated_at` → `last_update` | Impl | - |
| DONE | TASK-02 | Fix riferimento tabella nel service | In `src/services/inventoryService.ts` sostituire `.from('inventory')` con `.from('inventory_items')` in `getInventory`, `addItem`, `updateQuantity` | Impl | TASK-01 |
| DONE | TASK-03 | Test di integrazione Magazzino | Creare `scripts/test-inventory.mjs`: CRUD completo su `inventory_items` + verifica confine RLS admin/coach | Test | TASK-02 |
| DONE | TASK-04 | Regressione suite completa | Eseguire `npx supabase db reset` + `npm run test:integration` (tutte le suite, non solo la nuova) | Test | TASK-03 |
| TODO | TASK-05 | Verifica manuale pagina Magazzino | Verificare sull'app in esecuzione contro Supabase locale: caricamento lista, creazione articolo, modifica quantità, senza errori console/network (AC #4) | Test | TASK-02 |

---

_Piano generato via Archetipo Planning — 2026-07-25_
