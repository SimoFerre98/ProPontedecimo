# US-036: Hook unificato per i modali form — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-16

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come sviluppatore del progetto, voglio un hook riutilizzabile (`useFormModal`) che centralizzi loading, submit, invalidazione delle query e gestione errori dei modali, così che i 10+ modali non ripetano la stessa logica e una correzione valga per tutti.

**Criteri di Accettazione**
- [ ] Esiste un hook tipizzato che incapsula stato di loading, submit, `invalidateQueries` e gestione errori (integrata con il sistema toast di US-035)
- [ ] Tutti i modali in `src/components/modals` che seguono il pattern duplicato sono migrati all'hook (es. `AddAthleteModal`, `AddInventoryModal`, `NewPaymentModal`, `MedicalVisitModal`)
- [ ] Nessuna regressione funzionale nei flussi di creazione/modifica esistenti
- [ ] Il pattern è documentato per i modali futuri

**Nota di scoping (Emanuele → vedi Soluzione Tecnica):** dei 14 modali in `src/components/modals`, solo 5 seguono esattamente il pattern "singola submit → loading/try-catch/invalidate/close" descritto dalla story. Gli altri 9 hanno una forma diversa (azioni multiple nello stesso modale, wizard multi-step, o un contratto di chiusura diverso) e forzarli nello stesso hook produrrebbe un'astrazione fuori misura. Il criterio "tutti i modali che seguono il pattern duplicato" viene quindi interpretato in senso letterale — solo chi condivide davvero la stessa forma — non "tutti i 14 modali esistenti".

---

## Soluzione Tecnica

Il sistema di errori/toast di US-035 ha già introdotto `useToast()` e `getErrorMessage()`, e 4 dei modali coinvolti (`AddInventoryModal`, `MedicalVisitModal`, `NewPaymentModal`, `PaymentModal`) li usano già in un `catch` identico — manca solo l'estrazione del guscio comune (loading + try/catch/finally + invalidate + onSuccess/onClose) in un hook. `AddAthleteModal` invece usa ancora un `submitError` locale con banner inline e `console.error`, da migrare al toast per allinearsi al resto.

- **`useFormModal` (`src/hooks/useFormModal.ts`)**: accetta `{ onSubmit: () => Promise<void>, invalidateKeys?: QueryKey[], onSuccess?: () => void, onClose: () => void }` e ritorna `{ loading, submit }`. `submit(e?)` fa `e?.preventDefault()`, `setLoading(true)`, esegue `onSubmit()`, poi invalida ogni query key della lista, chiama `onSuccess?.()` e `onClose()`; il `catch` chiama `toast.error(getErrorMessage(err))` (niente `onClose()` nel catch, così i dati inseriti non si perdono, comportamento già garantito oggi); il `finally` fa `setLoading(false)`.
- **Perimetro di migrazione — 5 modali che condividono esattamente questa forma**: `AddAthleteModal`, `AddInventoryModal`, `NewPaymentModal`, `PaymentModal`, `MedicalVisitModal`. Ognuno passa il proprio `onSubmit` (la chiamata al service specifico) e le query key da invalidare già note dal codice attuale (es. `['payments']` + `['overduePaymentsCount']` per i due modali pagamento, `['medical-visits']` + `['medical-visits-stats']` + `['notifications']` per le visite).
- **Fuori scope, con motivazione esplicita** (nessuna migrazione forzata):
  - `EventModal`, `TaskModal` — due azioni indipendenti nello stesso modale (submit **e** delete, con loading separati), non un singolo submit.
  - `DeleteAthleteModal` — contratto diverso: non invalida query proprie (lo fa il chiamante via `onSuccess`) e non chiama `onClose()` in caso di successo.
  - `ProfileModal` — 4 azioni asincrone indipendenti (nome, avatar, password, ecc.) in un unico modale "impostazioni", non un form con un solo submit.
  - `NewSeasonWizardModal` — wizard multi-step con operazioni scaglionate, non un submit singolo.
  - `SettingsModal`, `SendEmailModal`, `CalendarModal`, `PlayerPaymentSummaryModal` — non seguono il pattern loading/try-catch/invalidate/close (azioni multiple, solo lettura, o stile difforme già prima di questa story).
- **Nessuna nuova dipendenza npm**: l'hook usa solo `useState`, `useQueryClient` (già in uso) e `useToast`/`getErrorMessage` di US-035.

📐 **Leonardo:** Il rischio KISS da evitare qui è il contrario del solito — non un vincolo troppo largo su una tabella condivisa, ma un hook generico forzato su modali che non condividono davvero la stessa forma. Meglio un hook stretto che copre bene 5 casi reali, con il resto documentato come eccezione esplicita, che un'interfaccia "universale" con parametri opzionali per ogni caso speciale.

🔧 **Ugo:** Confermo: `AddAthleteModal` è il caso più delicato perché il submit fa anche normalizzazione payload (stringhe vuote → `null`) prima di chiamare il service — quella logica resta nel componente, l'hook si limita a wrappare la chiamata già pronta. Nessun rischio di perdere la logica di validazione per-sezione, che resta fuori dall'hook (giustamente, non è responsabilità sua).

---

## Strategia di Test

Come per US-035, il progetto non ha un framework di test frontend configurato: la verifica è manuale via browser sui 5 modali migrati, più il controllo statico dei tipi. Nessuna migrazione DB coinvolta, quindi non serve `npm run test:integration`.

- Verifica manuale di ciascuno dei 5 modali migrati sul flusso di successo (submit riuscito → toast success se previsto, query invalidate, modale chiuso, dati aggiornati in lista)
- Verifica manuale di ciascuno dei 5 modali sul flusso di errore forzato (es. RPC che rifiuta) → toast di errore visibile, modale che resta aperto con i dati inseriti intatti, `loading` che torna `false`
- Verifica specifica per `AddAthleteModal`: confermare che il banner `submitError` inline sia sparito e sostituito dal toast, senza perdere la navigazione tra le sezioni del form in caso di errore
- Verifica di non-regressione sui 2 invalidate multipli (`NewPaymentModal`/`PaymentModal` → `payments` + `overduePaymentsCount`; `MedicalVisitModal` → `medical-visits` + `medical-visits-stats` + `notifications`): confermare che tutte le query elencate risultino effettivamente invalidate, non solo la prima
- `npx tsc --noEmit` a fine implementazione, come da convenzione di progetto prima di ogni review

🧪 **Mina:** Il punto da non derubricare è proprio il test dei multi-invalidate: un `forEach` scritto male che invalida solo la prima key del reduce passerebbe inosservato in una verifica superficiale che guarda solo "la lista si aggiorna".

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Hook `useFormModal` | Creare `src/hooks/useFormModal.ts`: `{ onSubmit, invalidateKeys?, onSuccess?, onClose }` → `{ loading, submit }`, con try/catch/finally, `toast.error(getErrorMessage)` nel catch, invalidate di tutte le key in `invalidateKeys` | Impl | - |
| DONE | TASK-02 | Migrare `MedicalVisitModal` | Sostituire `useState(loading)` + try/catch manuale con `useFormModal` | Impl | TASK-01 |
| TODO | TASK-03 | Verifica manuale `MedicalVisitModal` | Testare aggiornamento scadenza (successo + errore forzato), confermare invalidate di tutte le 3 query key | Test | TASK-02 |
| DONE | TASK-04 | Migrare `AddInventoryModal` | Sostituire loading/try-catch manuale con `useFormModal` | Impl | TASK-01 |
| TODO | TASK-05 | Verifica manuale `AddInventoryModal` | Testare creazione articolo (successo + errore forzato) | Test | TASK-04 |
| DONE | TASK-06 | Migrare `NewPaymentModal` | Sostituire loading/try-catch manuale con `useFormModal`, passando le 2 invalidate key | Impl | TASK-01 |
| DONE | TASK-07 | Migrare `PaymentModal` | Sostituire loading/try-catch manuale con `useFormModal`, passando le 2 invalidate key | Impl | TASK-01 |
| TODO | TASK-08 | Verifica manuale `NewPaymentModal` + `PaymentModal` | Testare creazione piano rate e registrazione pagamento (successo + errore forzato), confermare invalidate di entrambe le query key in ciascun caso | Test | TASK-06, TASK-07 |
| DONE | TASK-09 | Migrare `AddAthleteModal` | Sostituire `submitError`/`console.error` con `useFormModal` + toast; la normalizzazione payload resta nel componente, passata come `onSubmit` all'hook | Impl | TASK-01 |
| TODO | TASK-10 | Verifica manuale `AddAthleteModal` | Testare creazione/modifica atleta (successo + errore forzato), confermare che il banner inline sia sparito, il toast compaia e i dati/sezione attiva del form non si perdano in caso di errore | Test | TASK-09 |
| DONE | TASK-11 | Documentare il pattern | Aggiungere un breve commento d'uso sopra `useFormModal` (esempio minimo) e annotare nel file quali modali restano fuori scope e perché, come riferimento per i modali futuri | Impl | TASK-02, TASK-04, TASK-06, TASK-07, TASK-09 |
| TODO | TASK-12 | Verifica finale type-check | Eseguire `npx tsc --noEmit` e correggere eventuali errori residui prima della review | Test | TASK-03, TASK-05, TASK-08, TASK-10, TASK-11 |

---

_Piano generato via Archetipo Planning — 2026-07-16_
