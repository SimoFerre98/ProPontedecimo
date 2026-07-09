# US-015: Supporto pagamenti multi-rata — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-09

---

## User Story

**Epic:** EP-005 — Gestione Finanziaria e Quote
**Priorità:** HIGH | **Story Points:** 5

**Story**
Come Dirigente,
voglio dividere la quota annuale di un atleta in più rate (2, 3 o più) con scadenze e importi personalizzati, tracciando lo stato di ciascuna rata,
così che le famiglie possano pagare in modo dilazionato e l'amministrazione sappia sempre chi è in regola.

**Criteri di Accettazione**
- [ ] L'admin può creare un piano rate con numero di rate, importi e scadenze personalizzati per atleta
- [ ] Ogni rata ha uno stato tracciato (da pagare, pagata, scaduta) aggiornabile dall'amministrazione
- [ ] La somma delle rate è validata rispetto alla quota totale
- [ ] Il riepilogo finanziario dell'atleta mostra quota totale, rate saldate e residuo
- [ ] Le rate scadute e non pagate sono evidenziate nelle liste pagamenti

---

## Soluzione Tecnica

Lo schema `payments` non va toccato: supporta già rate arbitrarie (`installment_no` libero, importo e scadenza per riga, unique su `player_id`+`season_id`+`installment_no`). Il gap è tutto applicativo — l'unica via di scrittura oggi è `NewPaymentModal`, che genera sempre esattamente 1 o 2 rate a scadenza fissa (15 set / 15 gen) senza validare nulla. La soluzione introduce una RPC `create_payment_plan` che riceve l'elenco di rate (importo + scadenza) per un atleta+stagione, valida la somma rispetto alla quota totale dichiarata e scrive tutte le righe in un'unica transazione — atomicità che N chiamate separate a `upsertPayment` non garantirebbero, e punto naturale dove far vivere la regola di validazione senza fidarsi solo del client. Sul frontend, `NewPaymentModal` diventa un editor dinamico del piano; un nuovo `PlayerPaymentSummaryModal` copre l'AC4 riusando `getPaymentsByPlayer`, già presente in `paymentService.ts` ma orfano.

- RPC `create_payment_plan(p_player_id, p_season_id, p_total_amount, p_installments jsonb)`: valida rate non vuote, importi > 0, somma = totale (tolleranza 1 centesimo); **blocca** la sovrascrittura se esistono rate già pagate per quell'atleta+stagione (altrimenti si perderebbero ricevute già registrate), altrimenti sostituisce le rate ancora `pending` e inserisce le nuove con `installment_no` 1..N.
- Nessuna migrazione di schema: la tabella `payments` supporta già tutto il necessario; restano validi i vincoli esistenti (`installment_no >= 1`, unique player+season+rata) e la policy `payments_all_admin` (FOR ALL, president/director) già copre le nuove scritture senza modifiche RLS.
- Fix di un bug preesistente sulla stessa superficie: `NewPaymentModal` non passa mai `season_id` (colonna NOT NULL su `payments`) — il nuovo flusso lo recupera da `useAppStore` (stagione attiva/selezionata), come già fa `Payments.tsx`.
- Lo stato "scaduta" resta **derivato** (due_date passata + `status='pending'`), mai scritto a DB — coerente con `getOverdueCount()` che già lo calcola così. La tab "Scaduti" e la card statistica "Rate Scadute" di `Payments.tsx` oggi filtrano invece sul valore letterale `status = 'overdue'`, che nessun flusso scrive mai: vengono corrette per usare la stessa logica derivata, altrimenti l'AC5 non è dimostrabile sulla vista aggregata.
- `PlayerPaymentSummaryModal` (nuovo) riusa `getPaymentsByPlayer` per calcolare quota totale, rate saldate (conteggio + somma) e residuo, con la stessa evidenziazione delle rate scadute-non pagate già in uso in `Payments.tsx`.

---

## Strategia di Test

Il progetto non ha un framework di test frontend: la logica di business reale (validazione somma, blocco su rate già pagate, atomicità dell'inserimento) vive nella RPC, quindi è l'unico punto che merita un test di integrazione automatico reale contro Supabase locale. Il resto della verifica è manuale nel browser, come da convenzione di progetto.

- Test di integrazione RPC (`scripts/test-payment-plan.mjs`): piano valido a 1/2/3+ rate, rifiuto se la somma non coincide con il totale, sovrascrittura consentita solo se nessuna rata è già pagata (altrimenti errore esplicito), accesso negato per ruoli diversi da president/director (RLS `payments_all_admin`).
- Regressione con `npm run test:integration` (intera suite, non solo la nuova): la tabella `payments` è una superficie condivisa con US-003 (indici) e le policy RLS di US-002 — un test verde isolato non basta a escludere regressioni.
- Verifica manuale in browser: creazione piano 300€ in 3 rate con importi e scadenze diversi, blocco del submit se la somma non coincide, registrazione del pagamento di una rata (modal esistente `PaymentModal`) e controllo che il riepilogo atleta e la lista pagamenti si aggiornino di conseguenza.
- Verifica manuale del fix "Scaduti": creare una rata con scadenza passata e stato `pending`, controllare che compaia sia nella tab "Scaduti" sia nella card statistica di `Payments.tsx` sia come evidenziata nel riepilogo atleta.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione RPC `create_payment_plan` | Nuova funzione SQL che crea/sovrascrive in una transazione le N rate di un piano pagamento per atleta+stagione, validando che la somma degli importi coincida con la quota totale (tolleranza 1 centesimo) e bloccando la sovrascrittura se esistono rate già pagate. | Impl | - |
| DONE | TASK-02 | Test integrazione RPC piano rate | Nuovo script `scripts/test-payment-plan.mjs`: piano da 1/2/3+ rate, rifiuto su somma non coincidente, blocco su rate già pagate, accesso negato per ruoli non admin. | Test | TASK-01 |
| DONE | TASK-03 | Estendere `paymentService.ts` | Aggiungere `createPaymentPlan()` (wrapper della RPC); correggere `getPayments` e le statistiche di `Payments.tsx` per calcolare lo stato "scaduta" in modo derivato invece che sul valore letterale `overdue` mai scritto a DB. | Impl | TASK-01 |
| DONE | TASK-04 | Riscrivere `NewPaymentModal` come editor piano rate | Sostituire la selezione fissa Unica/2 Rate con uno stepper "numero di rate" (1-12) e righe dinamiche importo+scadenza; validazione live della somma rispetto alla quota totale; correggere il `season_id` mancante recuperandolo da `useAppStore`. | Impl | TASK-03 |
| DONE | TASK-05 | Correggere tab/stat "Scaduti" in `Payments.tsx` | Applicare la stessa logica derivata (due_date scaduta + `pending`) già usata per l'evidenziazione di riga anche al filtro server-side e alla card statistica, così tornano coerenti con l'AC5. | Impl | TASK-03 |
| DONE | TASK-06 | Creare `PlayerPaymentSummaryModal` | Nuovo modal che usa `getPaymentsByPlayer` per mostrare quota totale, rate saldate, residuo e l'elenco rate con evidenza delle scadute-non pagate; riusa lo `StatusBadge`, l'icona del metodo di pagamento (`payment_method`, già in uso in `Payments.tsx`) e la logica di evidenziazione già presenti. | Impl | TASK-03 |
| DONE | TASK-07 | Collegare il riepilogo pagamenti in `Athletes.tsx` | Aggiungere il trigger (icona/azione) sulla card atleta che apre `PlayerPaymentSummaryModal` per l'atleta selezionato. | Impl | TASK-06 |
| TODO | TASK-08 | Verifica manuale end-to-end | Con Supabase locale: creazione piano 300€/3 rate con scadenze diverse, blocco su somma errata, registrazione pagamento di una rata, controllo che riepilogo atleta e lista pagamenti riflettano lo stato aggiornato. | Test | TASK-04, TASK-05, TASK-07 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-015/` (`piano-rate-editor.html`, `riepilogo-pagamenti-atleta.html`).

_Piano generato via Archetipo Planning — 2026-07-09_
