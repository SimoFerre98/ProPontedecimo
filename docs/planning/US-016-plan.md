# US-016: Trascinamento insoluti anno precedente — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-10

---

## User Story

**Epic:** EP-005 — Gestione Finanziaria e Quote
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come Dirigente,
voglio che all'avvio della nuova stagione gli insoluti della stagione precedente vengano calcolati e riportati nel profilo finanziario corrente dell'atleta come "debito pregresso",
così che nessun credito della società vada perso nel passaggio di stagione.

**Criteri di Accettazione**
- [ ] Alla creazione della nuova stagione (via wizard, US-008) il residuo non saldato di ogni atleta importato è calcolato dalle rate non pagate (dipende da US-015)
- [ ] Il debito pregresso è visibile come voce distinta nel profilo finanziario corrente dell'atleta
- [ ] Un atleta senza insoluti non mostra alcuna voce di debito pregresso
- [ ] Il pagamento del debito pregresso è tracciabile come le altre rate

---

## Soluzione Tecnica

Il vincolo reale non è calcolare il residuo (una somma sulle rate `pending`), ma il fatto che oggi **non esiste alcun collegamento tra la riga giocatore di una stagione e quella della stagione precedente per la stessa persona**: `create_season_from_wizard` copia i campi anagrafici generando un nuovo `id`, senza tracciare la provenienza. La soluzione introduce quel collegamento e usa la stessa transazione del wizard — già atomica per design (US-008) — per calcolare e scrivere il debito pregresso, evitando un secondo giro di RPC che romperebbe la garanzia "wizard abbandonato = nessun dato parziale". Il debito viene rappresentato come una riga `payments` ordinaria (stessa tabella, stesso ciclo di incasso) marcata con un valore dedicato di `plan`, così l'AC4 è gratis: si paga con lo stesso `PaymentModal` già esistente. Questo però tocca due RPC condivise con US-008 e US-015, quindi entrambe vengono aggiornate per coesistere esplicitamente con la nuova riga invece di limitarsi a soddisfare i propri criteri in isolamento.

- **Migrazione — colonna `players.previous_player_id`** (uuid, nullable, `REFERENCES players(id)`): valorizzata da `create_season_from_wizard` con l'`id` della riga sorgente (`up.player_id`, già disponibile nel CTE di copia esistente). Nessun impatto sulle scritture esistenti: colonna additiva, resta `NULL` per import storici e per gli atleti creati direttamente in stagione (non tramite wizard).
- **Migrazione — estensione del CHECK `payments_plan_check`**: aggiunto il valore `'carried_over'` accanto ai già esistenti `'annual'`/`'installments'`. Nessuna nuova tabella: la riga di debito pregresso è una riga `payments` come le altre, distinguibile tramite `plan`.
- **`create_season_from_wizard` (RPC, modifica)**: dopo l'insert dei giocatori copiati, per ogni nuova riga con `previous_player_id` valorizzato si somma `amount_eur` delle rate `status='pending'` della stagione sorgente per quel `player_id`; se la somma supera 1 centesimo si inserisce **una sola riga** `payments` nella nuova stagione (`installment_no=1`, `plan='carried_over'`, `status='pending'`, `amount_eur` = somma, `due_date` = data di inizio della nuova stagione). Atleti senza insoluti (somma zero o nessuna rata `pending`) non generano alcuna riga — soddisfa direttamente l'AC3. Tutto resta nella stessa transazione della RPC esistente: se il wizard fallisce, rollback anche del debito.
- **`create_payment_plan` (RPC, fix difensivo — superficie condivisa con US-015)**: oggi cancella *tutte* le rate `player_id`+`season_id` a ogni salvataggio piano e blocca la sovrascrittura se esiste una rata `paid`. Senza intervento, creare un piano rate nella nuova stagione cancellerebbe silenziosamente il debito pregresso appena importato (o, se già pagato, bloccherebbe per sempre la modifica del piano corrente). La funzione viene corretta per escludere `plan = 'carried_over'` da: la `DELETE` di sovrascrittura, il controllo "esistono rate già pagate", e la numerazione (`installment_no` del nuovo piano riparte dopo il massimo tra le righe carried-over, per non collidere con il vincolo unique).
- **Frontend — `PlayerPaymentSummaryModal`**: nuova card statistica "Debito Pregresso" mostrata solo se esiste una riga `plan='carried_over'` per l'atleta/stagione (riusa `getPaymentsByPlayer`, già presente), con badge di stato pagato/in attesa; le tre card esistenti (Quota Totale, Rate Saldate, Residuo) continuano a riflettere solo le rate della stagione corrente (`plan <> 'carried_over'`), per non mischiare i due importi nello stesso totale.
- **Frontend — `Payments.tsx`**: la riga con `plan==='carried_over'` mostra l'etichetta "Debito Pregresso" al posto di "Nª Rata" (stesso punto dove oggi si distingue già `plan === 'annual'`); resta cliccabile e incassabile con lo stesso `PaymentModal` di qualunque altra rata, soddisfacendo l'AC4 senza nuovo componente.
- **Alternativa scartata**: tabella dedicata `carried_over_debts` invece di riusare `payments`. Più isolata, ma l'AC4 ("tracciabile come le altre rate") richiederebbe duplicare il flusso di incasso, i filtri e la UI già esistenti — complessità non giustificata per un singolo importo aggregato per atleta+stagione.

---

## Strategia di Test

Il rischio è tutto nel confine tra le due RPC condivise (US-008 e US-015), non nell'aritmetica del residuo; i test di integrazione restano l'unico automatismo reale del progetto, ampliando le suite esistenti invece di crearne di isolate.

- **`scripts/test-rpc-wizard.mjs` (esteso)**: atleta con rate `pending` nella stagione sorgente → riga `carried_over` creata nella nuova stagione con l'importo corretto e `previous_player_id` valorizzato; atleta con tutte le rate `paid` nella stagione sorgente → nessuna riga di debito (AC3); atleta senza alcuna rata configurata → nessuna riga di debito; rollback del wizard (player_id invalido nel payload) → nessuna riga `payments` scritta, coerente con l'atomicità già testata per US-008.
- **`scripts/test-payment-plan.mjs` (esteso)**: con una riga `carried_over` preesistente per l'atleta, creare un nuovo piano rate con `create_payment_plan` → la riga di debito sopravvive (non viene cancellata), non impedisce la creazione se non è `paid`, e la nuova numerazione `installment_no` non collide con quella del debito; se la riga `carried_over` è `paid`, il piano corrente resta comunque modificabile (il controllo "rate già pagate" ignora `carried_over`).
- **Regressione con `npm run test:integration`** (intera suite): `players` e `payments` sono superfici condivise con US-002/US-003/US-008/US-009/US-015 — un test verde isolato non basta a escludere regressioni incrociate.
- **Verifica manuale in browser**: eseguire il wizard su un atleta con insoluti reali dalla stagione precedente, controllare la nuova card "Debito Pregresso" nel riepilogo atleta, incassare quella riga da `Payments.tsx` con il flusso esistente e verificare che sparisca dal residuo; ripetere con un atleta senza insoluti e controllare che nessuna card compaia (AC3).

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione `previous_player_id` + estensione CHECK `plan` | Nuova colonna nullable `players.previous_player_id uuid REFERENCES players(id)`; estensione di `payments_plan_check` per includere `'carried_over'`. | Impl | - |
| DONE | TASK-02 | Estendere `create_season_from_wizard` | Valorizzare `previous_player_id` nella copia atleti; dopo l'insert, calcolare per ogni nuovo giocatore la somma delle rate `pending` della stagione sorgente e inserire una riga `payments` `plan='carried_over'` solo se la somma supera 1 centesimo, nella stessa transazione. | Impl | TASK-01 |
| DONE | TASK-03 | Test integrazione carry-over nel wizard | Estendere `scripts/test-rpc-wizard.mjs`: riga carried_over creata con importo corretto, nessuna riga se rate tutte pagate o assenti (AC3), rollback invariato su player_id invalido. | Test | TASK-02 |
| DONE | TASK-04 | Fix difensivo `create_payment_plan` | Escludere `plan='carried_over'` dalla `DELETE` di sovrascrittura, dal controllo "rate già pagate" e dalla numerazione `installment_no` (riparte dopo il massimo delle righe carried-over). | Impl | TASK-01 |
| DONE | TASK-05 | Test integrazione coesistenza piano rate / debito pregresso | Estendere `scripts/test-payment-plan.mjs`: creazione piano con debito pregresso preesistente → il debito sopravvive, non collide sulla numerazione, non blocca la modifica anche se il debito è già `paid`. | Test | TASK-04 |
| DONE | TASK-06 | Aggiornare `paymentService`/tipi | Aggiungere `previous_player_id` al tipo `players` e il valore `'carried_over'` al tipo `PaymentPlan` in `paymentService.ts` e `src/types/database.ts`. | Impl | TASK-01 |
| DONE | TASK-07 | Card "Debito Pregresso" in `PlayerPaymentSummaryModal` | Nuova card statistica visibile solo se esiste una riga `plan='carried_over'`; le card esistenti (Quota Totale, Rate Saldate, Residuo) calcolano solo sulle rate `plan <> 'carried_over'`. | Impl | TASK-06 |
| DONE | TASK-08 | Etichetta "Debito Pregresso" in `Payments.tsx` | Sostituire l'etichetta "Nª Rata" con "Debito Pregresso" quando `plan === 'carried_over'`, riga incassabile con il `PaymentModal` esistente senza modifiche al flusso di incasso. | Impl | TASK-06 |
| DONE | TASK-09 | Verifica manuale end-to-end | Con Supabase locale: wizard su atleta con insoluti reali → card debito pregresso visibile, incasso da `Payments.tsx`, sparizione dal residuo; atleta senza insoluti → nessuna card (AC3). | Test | TASK-07, TASK-08 |

---

_Piano generato via Archetipo Planning — 2026-07-10_
