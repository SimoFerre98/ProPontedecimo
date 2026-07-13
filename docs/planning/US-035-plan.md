# US-035: Gestione errori globale e feedback utente — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-13

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** HIGH | **Story Points:** 3

**Story**
Come utente della piattaforma, voglio che ogni errore di caricamento o salvataggio venga segnalato con un messaggio chiaro, così che io non mi trovi mai davanti a pagine vuote o salvataggi falliti in silenzio.

**Criteri di Accettazione**
- [ ] Un Error Boundary globale intercetta gli errori di rendering e mostra una schermata di fallback con possibilità di ricaricare
- [ ] Le query fallite (`isError`) mostrano un messaggio di errore visibile all'utente, non un'interfaccia vuota (oggi nessuna pagina gestisce l'errore, es. `Athletes.tsx`)
- [ ] Le mutazioni fallite nei modali mostrano un errore chiaro e non chiudono il modale perdendo i dati inseriti
- [ ] È introdotto un sistema di toast/notifiche unificato, coerente con il design system Premium Glass

---

## Soluzione Tecnica

Il progetto ha già gli ingredienti giusti sparsi ma non centralizzati: un pattern visivo `.save-toast` in `index.css` (pillola glass con bordo colorato, oggi usato solo in `ProfileModal`), le variabili semantiche `--rose`/`--gold`/`--emerald`, e `framer-motion` già in dipendenza. Invece di installare una libreria toast esterna, si generalizza il pattern esistente in un sistema centralizzato con Context + hook. Per le query fallite si introduce un componente di stato inline riusabile (non un toast, che scomparirebbe lasciando di nuovo l'utente davanti al vuoto) sullo stile dell'empty-state già presente nelle tabelle.

- **`ToastProvider` + `useToast()`** (`src/contexts/ToastContext.tsx`): espone `toast.success/error/info(msg)`, gestisce una coda con auto-dismiss (4s) e animazioni `AnimatePresence`. Il `<ToastContainer />` si monta una sola volta in `App.tsx`, dentro `QueryClientProvider` e sopra `<Router>`, disponibile anche su Login/Register. Estende visivamente `.save-toast` con varianti colore per bordo/icona (`--emerald` successo, `--rose` errore, `--gold` info).
- **`getErrorMessage(error: unknown): string`** (`src/lib/errors.ts`): estrae `error.message` se presente (i messaggi delle RPC Postgres sono già in italiano leggibile), altrimenti ritorna un fallback italiano generico. Nessuna traduzione automatica dei messaggi custom delle RPC: vanno mostrati as-is.
- **Fix dei 6 punti di catch silenzioso** nei modali (`NewPaymentModal`, `PaymentModal`, `MedicalVisitModal`, `AddInventoryModal`, 2 in `ProfileModal`): sostituire `console.error(err)` con `toast.error(getErrorMessage(err))`. Nessuno di questi modali chiama `onClose()` dentro il catch, quindi "non perdere i dati inseriti" è già garantito — manca solo il feedback visibile.
- **`<QueryErrorState />`** (`src/components/ui/query-error-state.tsx`): icona `AlertTriangle`, messaggio d'errore e bottone "Riprova" che chiama `refetch()`. Da usare in ogni pagina con `useQuery` quando `isError` è true, prima del ramo vuoto/dati: `isLoading ? <Skeleton/> : isError ? <QueryErrorState/> : data.length === 0 ? <EmptyState/> : <Rows/>`. Applicato a `Athletes`, `Payments`, `MedicalVisits`, `Inventory`, `StaffTasks`, `Attendance`, `Dashboard` — tutte chiamano `useQuery` direttamente (non tramite hook custom), quindi `refetch` è sempre disponibile.
- **`ErrorBoundary`** (`src/components/ErrorBoundary.tsx`): class component con `getDerivedStateFromError`/`componentDidCatch`, fallback a schermo intero in stile glass-card con messaggio e bottone "Ricarica pagina" (`window.location.reload()`). Montato in `main.tsx` attorno a `<App />`, così cattura anche errori nel provider di autenticazione o nel router.
- **Nessuna modifica al `QueryClient` globale**: i modali non usano uniformemente `useMutation` (molti chiamano il service direttamente in `handleSubmit`), quindi un `onError` globale su `MutationCache` non intercetterebbe tutti i casi in modo affidabile — si preferisce l'intervento esplicito per-modale, bounded e verificabile uno a uno.
- **Zero nuove dipendenze npm**: tutto costruito su `framer-motion` e Tailwind già presenti, in linea con lo stile hand-rolled degli altri componenti UI del progetto.

---

## Strategia di Test

Il progetto non ha un framework di test frontend configurato (niente vitest/jest/@testing-library): la verifica di questa story è manuale via browser, più il controllo statico dei tipi. Nessuna migrazione DB è coinvolta, quindi non serve `npm run test:integration`.

- Verifica manuale dell'Error Boundary: forzare un errore di rendering controllato (es. componente di debug temporaneo che lancia un'eccezione), confermare che compaia la schermata di fallback glass-card e che "Ricarica pagina" ripristini l'app
- Verifica manuale del `QueryErrorState`: simulare un errore di rete/RPC su almeno 2 delle 7 pagine coinvolte (es. Supabase offline o URL errato temporaneo), confermare che compaia il messaggio invece dell'empty-state e che "Riprova" richiami `refetch()` e recuperi i dati una volta ripristinata la connessione
- Verifica manuale dei toast nei modali corretti: forzare il fallimento di ciascuna delle mutazioni nei 6 punti individuati (es. RPC che rifiuta per validazione), confermare che il toast d'errore compaia con il messaggio della RPC e che il modale resti aperto con i dati inseriti intatti
- Verifica manuale del toast di successo: confermare che almeno un flusso di salvataggio riuscito mostri il toast `success` (per validare visivamente lo stile coerente con Premium Glass, non solo il caso d'errore)
- `npx tsc --noEmit` a fine implementazione, come da convenzione di progetto prima di ogni review

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Utility `getErrorMessage` | Creare `src/lib/errors.ts` con la funzione che estrae `error.message` o ritorna un fallback italiano generico | Impl | - |
| TODO | TASK-02 | Sistema toast (Context + hook) | Creare `src/contexts/ToastContext.tsx` con `ToastProvider`, `useToast()` e `<ToastContainer />`, stile esteso da `.save-toast` con varianti emerald/rose/gold | Impl | - |
| TODO | TASK-03 | Montare `ToastProvider` in `App.tsx` | Avvolgere l'app con `ToastProvider` dentro `QueryClientProvider`, sopra `<Router>` | Impl | TASK-02 |
| TODO | TASK-04 | Componente `ErrorBoundary` | Creare `src/components/ErrorBoundary.tsx` (class component) con fallback glass-card e bottone "Ricarica pagina" | Impl | - |
| TODO | TASK-05 | Montare `ErrorBoundary` in `main.tsx` | Avvolgere `<App />` con `<ErrorBoundary>` nell'entry point | Impl | TASK-04 |
| TODO | TASK-06 | Verifica manuale Error Boundary | Forzare un errore di rendering controllato e confermare fallback + reload funzionanti | Test | TASK-05 |
| TODO | TASK-07 | Componente `QueryErrorState` | Creare `src/components/ui/query-error-state.tsx` con icona, messaggio e bottone "Riprova" (`refetch`) | Impl | TASK-01 |
| TODO | TASK-08 | Integrare `QueryErrorState` nelle pagine | Aggiungere il ramo `isError` in `Athletes`, `Payments`, `MedicalVisits`, `Inventory`, `StaffTasks`, `Attendance`, `Dashboard`, destrutturando `refetch` dove manca | Impl | TASK-07 |
| TODO | TASK-09 | Verifica manuale query error state | Simulare un errore di rete/RPC su almeno 2 pagine e confermare messaggio + retry funzionante | Test | TASK-08 |
| TODO | TASK-10 | Fix dei 6 catch silenziosi nei modali | Sostituire `console.error(err)` con `toast.error(getErrorMessage(err))` in `NewPaymentModal`, `PaymentModal`, `MedicalVisitModal`, `AddInventoryModal` e i 2 punti in `ProfileModal` | Impl | TASK-01, TASK-03 |
| TODO | TASK-11 | Verifica manuale mutation error nei modali | Forzare il fallimento di ciascuna mutazione corretta e confermare toast visibile + modale che resta aperto con i dati intatti | Test | TASK-10 |
| TODO | TASK-12 | Verifica finale type-check | Eseguire `npx tsc --noEmit` e correggere eventuali errori residui prima della review | Test | TASK-06, TASK-09, TASK-11 |

---

_Piano generato via Archetipo Planning — 2026-07-13_
