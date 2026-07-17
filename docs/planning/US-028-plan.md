# US-028: Bilancio e scadenze dei figli — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-17

---

## User Story

**Epic:** EP-010 — Portale Genitore & Pagamenti Online
**Priorità:** LOW | **Story Points:** 3

**Story**
Come Genitore,
voglio visualizzare per ciascun figlio lo stato dei pagamenti (rate saldate, rate residue, quote della stagione) e le scadenze mediche,
così che io sappia sempre cosa è dovuto e quali documenti sono in scadenza.

**Criteri di Accettazione**
- [ ] Per ogni figlio associato (US-027) sono visibili quota, rate saldate e residue della stagione in corso (dipende da US-015)
- [ ] La scadenza della visita medica di ciascun figlio è visibile ed evidenziata se imminente o scaduta
- [ ] I dati sono in sola lettura per il genitore

> **Nota di scope (Emanuele):** nessuna ambiguità bloccante. Le quattro policy RLS parent-scoped (`players_select_parent`, `medical_select_parent`, `payments_select_parent`, `attendance_select_parent`), derivate da `get_parent_player_ids()` e già filtrate su `status = 'confirmed'` (US-002/US-027), coprono già in lettura tutto ciò che serve: il gap di questa story è puramente frontend. I figli in stato `pending` (visibili in "I miei figli" solo come promemoria di richiesta in attesa) vanno esclusi esplicitamente dalla UI di bilancio: RLS non restituirebbe comunque i loro dati, ma mostrare una card vuota per un figlio non ancora confermato sarebbe fuorviante. Caso implicito coperto da Mina: un figlio confermato senza rate registrate per la stagione attiva va mostrato come "nessuna quota assegnata", non come errore.

---

## Soluzione Tecnica

Nessuna migrazione DB è necessaria: le policy RLS parent-scoped esistono già e autorizzano lettura diretta su `players`, `payments` e `medical_visits` filtrata sui figli confermati, quindi la soluzione consiste nel comporre in frontend dati già accessibili, riutilizzando calcoli e componenti visivi già maturi altrove nell'app.

- **Nessuna nuova RPC o policy**: il genitore legge `payments` e `players.medical_expiry` con normali query `supabase.from(...)`, autorizzate dalle policy `payments_select_parent` e `players_select_parent` già esistenti; niente da toccare nella tabella "Superfici condivise" di CLAUDE.md perché non si introduce alcuna scrittura né si modifica `get_parent_player_ids()`.
- **Stagione attiva recuperata ad-hoc**: `PortalLayout` non carica le stagioni nello store (lo fa solo `DashboardLayout`), quindi la nuova UI esegue una query diretta `seasons.select('*').eq('is_active', true).single()`, autorizzata a qualunque utente autenticato dalla policy `seasons_select_all`.
- **Riuso del service layer esistente**: `getPaymentsByPlayer(playerId, seasonId)` di `paymentService.ts` viene chiamata una volta per figlio confermato (numero tipicamente 1-3, niente batching prematuro); per la scadenza medica si aggiunge a `parentService.ts` una singola query batch `players.select('id, medical_expiry').in('id', childIds)` sui soli figli confermati.
- **Riuso dei pattern di calcolo/visualizzazione**: quota totale/rate saldate/residue riprende la logica già scritta in `PlayerPaymentSummaryModal.tsx`; lo stato scadenza medica (`valid`/`expiring`/`expired`/`missing`) riusa `medicalService.calculateStatus()` e la palette colori già in uso in `MedicalVisits.tsx` (emerald/amber/rose/neutro).
- **Estensione di `PortalDashboard.tsx`, non nuova route**: i due placeholder "Stato Pagamenti"/"Visite Mediche" (oggi marcati "Presto") vengono sostituiti da un nuovo componente `ChildBillingCard.tsx`, uno per figlio confermato — evitando la complessità di una route `/portal/figli` non giustificata da una story da 3 punti.
- **Sola lettura per costruzione**: nessuna mutazione, nessun bottone di modifica nel nuovo componente — l'AC3 è garantito sia dalla UI (nessuna azione di scrittura esposta) sia dall'assenza di policy INSERT/UPDATE per il ruolo `parent` su `payments`/`players`.

---

## Strategia di Test

Il rischio principale non è la UI ma confermare che l'isolamento dati già esistente (RLS parent-scoped) si comporti correttamente anche per le nuove query dirette introdotte da questa story, e che i figli `pending` restino invisibili nel bilancio.

- **Integrazione (nuovo `scripts/test-parent-billing.mjs`)**: un genitore con un figlio confermato e rate parzialmente saldate legge correttamente `payments` per quel figlio nella stagione attiva; lo stesso genitore non ottiene righe per un figlio `pending` o per un figlio di un altro genitore (regressione diretta su `payments_select_parent`/`players_select_parent`); un figlio confermato senza rate per la stagione attiva restituisce un set vuoto (non un errore).
- **Integrazione (regressione obbligatoria, superficie condivisa `parent_players`/RLS)**: `npx supabase db reset` + `npm run test:integration`, con attenzione a `test-rls.mjs` e `test-parent-children.mjs` — nessuna migrazione è prevista in questa story, ma la suite va comunque eseguita per escludere effetti collaterali sulle query dirette aggiunte.
- **Type-check**: `npx tsc --noEmit` dopo l'aggiunta delle nuove funzioni di servizio e del componente.
- **Manuale (UI, ruolo genitore)**: login come `parent` con almeno un figlio confermato con rate parzialmente saldate e uno con scadenza medica imminente/scaduta; verificare quota/rate/scadenza corrette e nessun controllo di modifica visibile; verificare che un figlio `pending` non mostri alcuna card di bilancio.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Funzioni di servizio per bilancio figli | Aggiungere a `parentService.ts`: recupero stagione attiva e query batch `players.select('id, medical_expiry').in('id', childIds)` sui figli confermati | Impl | - |
| DONE | TASK-02 | Test integrazione RLS bilancio genitore | Nuovo `scripts/test-parent-billing.mjs`: lettura corretta pagamenti/scadenza per figli confermati, isolamento da figli `pending` e da altri genitori, caso "nessuna quota assegnata" | Test | TASK-01 |
| DONE | TASK-03 | Hook di composizione dati | Comporre per ciascun figlio confermato: `getPaymentsByPlayer` (riuso esistente) + scadenza medica batch, in un hook/funzione dedicata usata da `PortalDashboard.tsx` | Impl | TASK-01 |
| DONE | TASK-04 | Componente `ChildBillingCard.tsx` | Card read-only: quota totale, rate saldate/residue (badge riuso pattern `PlayerPaymentSummaryModal`), badge scadenza medica (riuso `calculateStatus` + colori `MedicalVisits.tsx`) | Impl | - |
| DONE | TASK-05 | Integrazione in `PortalDashboard.tsx` | Sostituire i placeholder "Stato Pagamenti"/"Visite Mediche" con `ChildBillingCard` per ciascun figlio confermato (i figli `pending` restano esclusi) | Impl | TASK-03, TASK-04 |
| DONE | TASK-06 | Verifica manuale end-to-end | Login genitore con figli in stati/scenari misti (rate parziali, scadenza imminente/scaduta, nessuna quota assegnata, figlio pending) e conferma coerenza dati e sola lettura | Test | TASK-05 |
| DONE | TASK-07 | Regressione completa | `npx supabase db reset` + `npm run test:integration` (in particolare `test-rls.mjs`, `test-parent-children.mjs`, nuovo `test-parent-billing.mjs`) + `npx tsc --noEmit` | Test | TASK-02, TASK-05, TASK-06 |

---

_Piano generato via Archetipo Planning — 2026-07-17_
