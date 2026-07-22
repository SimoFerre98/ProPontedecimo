# US-040: Fix drag & drop della board Kanban — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-22

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come membro dello staff, voglio trascinare le card dei task tra le colonne della board Kanban e vedere lo stato aggiornarsi, così che la gestione dei task funzioni come l'interfaccia lascia intendere.

**Criteri di Accettazione**
- [ ] Il drag & drop delle card tra colonne funziona e invoca `onStatusChange` con il nuovo stato
- [ ] Il fix non usa cast disonesti: gli handler nativi passano da `onDragStartCapture` (che framer-motion inoltra al DOM) o da un elemento non-motion dedicato
- [ ] Il comportamento è verificato manualmente sulla board (trascinamento riuscito + persistenza dello stato)

---

## Soluzione Tecnica

In `src/components/tasks/KanbanBoard.tsx` la card trascinabile è un `motion.div` con `draggable` nativo e `onDragStart`/`onDragEnd`: framer-motion intercetta queste due prop come proprie gesture pointer-based (parte del suo sistema `drag`, indipendente dal fatto che la prop `drag` sia attiva) e non le inoltra mai al nodo DOM reale, per cui gli handler nativi di `KanbanBoard.tsx` non partono mai e il doppio cast `as unknown as React.DragEvent` serviva solo a zittire TypeScript sul mismatch di tipo che ne conseguiva. La correzione usa la variante capture-phase degli stessi eventi, che framer-motion non riconosce come propria e quindi lascia passare inalterata fino al DOM:

- Sostituire `onDragStart` con `onDragStartCapture` sul `motion.div` della card: l'handler riceve direttamente un `React.DragEvent` nativo, il doppio cast sparisce perché non serve più (il tipo è già quello corretto).
- Aggiungere `onDragEndCapture={() => setDraggedTaskId(null)}` sullo stesso `motion.div`: il browser spara sempre un evento nativo `dragend` sull'elemento sorgente, sia in caso di drop riuscito sia in caso di annullamento (rilascio fuori da una colonna valida, tasto Esc) — senza questo reset la card resterebbe bloccata a `opacity-0` (riga 117) ogni volta che un drag viene iniziato ma non completato con successo. Non è negli AC espliciti, ma è un side-effect diretto del fix necessario perché "vedere lo stato aggiornarsi" resti affidabile anche nei percorsi di annullamento.
- Nessun'altra superficie viene toccata: `onDragOver`/`onDrop` sono già su elementi `div` non-motion (le colonne) e già inoltravano correttamente; il wiring di `onStatusChange` in `src/pages/StaffTasks.tsx` resta invariato.

**Alternativa valutata e scartata:** spostare `draggable` e gli handler su un elemento wrapper non-motion annidato dentro la card (la seconda via ammessa dall'AC). Tecnicamente valida, ma richiederebbe ristrutturare la gerarchia `motion.div`/`AnimatePresence` che oggi gestisce le animazioni di layout (`layout`, `initial`/`animate`/`exit`), con un diff più ampio e più rischio di rompere le transizioni esistenti a fronte dello stesso identico risultato funzionale. La via `*Capture` risolve il problema con un diff minimo sullo stesso elemento.

---

## Strategia di Test

Il progetto non ha infrastruttura di test automatici per componenti React (nessun `vitest.config`, nessun file `*.test.tsx` di progetto), coerente con l'AC che richiede esplicitamente verifica manuale. La strategia copre quindi uno static check e scenari manuali mirati:

- **Static check:** `npx tsc --noEmit` deve passare senza errori sulle righe modificate, a conferma che non servono più cast per allineare i tipi (verifica diretta dell'AC #2).
- **Manuale — happy path:** trascinare una card da "Ready" a "Done", verificare che la card si sposti visivamente nella colonna corretta e che venga invocato `onStatusChange` (osservabile da network/console tramite `staffService.updateTaskStatus`); ricaricare la pagina e confermare che lo stato persiste.
- **Manuale — annullamento del drag:** iniziare un drag e rilasciare fuori da qualunque colonna valida (o premere Esc durante il trascinamento), verificare che la card ricompaia (non resti bloccata a opacità zero) grazie al reset di `onDragEndCapture`.
- **Manuale — regressione click:** confermare che il click sulla card (apertura modale di modifica task, gestito da un semplice `onClick` non toccato dal fix) continua a funzionare invariato dopo la modifica.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Fix handler nativi drag & drop | In `KanbanBoard.tsx`, sostituire `onDragStart` con `onDragStartCapture` (rimuovendo il doppio cast) e aggiungere `onDragEndCapture` per resettare `draggedTaskId` sul `motion.div` della card | Impl | - |
| DONE | TASK-02 | Static check TypeScript | Eseguire `npx tsc --noEmit` e confermare che non emergano errori né cast residui sulle righe modificate | Test | TASK-01 |
| DONE | TASK-03 | Verifica manuale sulla board | Verificare sull'app in esecuzione: trascinamento riuscito con persistenza dopo refresh, annullamento del drag con ripristino della card, regressione del click per l'apertura della modale | Test | TASK-01 |

---

_Piano generato via Archetipo Planning — 2026-07-22_
