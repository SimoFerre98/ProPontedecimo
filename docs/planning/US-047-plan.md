# US-047: Fix loop di refetch del profilo utente dopo il login — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-24

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come utente autenticato, voglio che l'applicazione recuperi il mio profilo una sola volta dopo il login, così che l'app non generi centinaia di richieste ridondanti e non sprechi banda/risorse del progetto Supabase.

**Criteri di Accettazione**
- [ ] Dopo il login, la console del browser non mostra più l'errore React "Maximum update depth exceeded"
- [ ] Il network tab non mostra più richieste ripetute e ravvicinate verso `GET .../rest/v1/profiles?...id=eq.<uid>` a fronte della stessa sessione utente invariata
- [ ] Il comportamento è verificato manualmente: login, navigazione tra almeno due pagine protette, nessun loop osservato per almeno 10 secondi di inattività

---

## Soluzione Tecnica

La causa è nell'effect di `AuthContext.tsx` che sottoscrive `onAuthStateChange`: oggi ogni evento — incluso l'`INITIAL_SESSION` sintetico che supabase-js v2 emette immediatamente alla sottoscrizione (duplicando la chiamata parallela a `getSession()` già presente nello stesso effect), e ogni `TOKEN_REFRESHED` periodico per una sessione con lo stesso utente — richiama `fetchProfile` in modo incondizionato. La fetch asincrona verso `profiles` viene inoltre eseguita direttamente dentro il callback sincrono del listener: è il pattern esplicitamente sconsigliato dalla documentazione Supabase, perché una query al DB lanciata da dentro quel callback può interferire con il lock interno del client auth e causare la ri-emissione ricorsiva di eventi — da cui la sequenza di centinaia di richieste identiche e l'errore React "Maximum update depth exceeded" (ogni evento porta un nuovo oggetto `session`, quindi un nuovo `setSession(...)` → re-render → nuovo giro).

- Un solo punto di fetch iniziale: eliminare la chiamata separata a `supabase.auth.getSession()` e affidarsi esclusivamente all'evento `INITIAL_SESSION` nativo di `onAuthStateChange`, che supabase-js v2 garantisce già alla sottoscrizione
- Guardia via `useRef` sull'ultimo `user.id` per cui il profilo è stato effettivamente recuperato: se l'evento riporta lo stesso user id già caricato (tipico di `TOKEN_REFRESHED` o eventi duplicati), si aggiorna solo `session` senza richiamare `fetchProfile` — deliberatamente non un `useEffect` con dipendenza su `profile`/`session`, che ricreerebbe lo stesso problema di instabilità di riferimento
- Deferire la chiamata a `fetchProfile` fuori dal callback sincrono con un `setTimeout(() => {...}, 0)`, come raccomandato dalla documentazione ufficiale Supabase per evitare l'interferenza con il lock interno del client
- `refreshProfile()` resta invariato come escape hatch esplicito che bypassa la guardia (fetch sempre fresca on-demand, usato da `ProfileModal` dopo il salvataggio); il ref viene azzerato anche sugli eventi di logout, così un login successivo forza sempre un fetch pulito

---

## Strategia di Test

Nel repository non esiste un framework di test frontend (nessun `vitest`/`jest`): le uniche suite automatiche sono le integrazioni backend in `scripts/test-*.mjs` contro Supabase locale, che qui non si applicano perché la storia non tocca schema DB, RLS o RPC. La verifica è quindi interamente manuale, in browser con Supabase locale attivo.

- Golden path (AC1/AC2/AC3): login, navigazione tra almeno due pagine protette, console e network tab osservati per 10+ secondi di inattività — nessun "Maximum update depth exceeded", nessuna `GET .../profiles` ripetuta
- Refresh di sessione con utente invariato: verificare che un evento `TOKEN_REFRESHED` (o una seconda tab con la stessa sessione) non generi un nuovo fetch di `profiles`
- Cambio utente: logout e login con un utente di ruolo diverso, per confermare che la guardia anti-refetch non impedisce il caricamento del profilo corretto del nuovo utente
- Logout/login ripetuto con lo stesso utente nella stessa tab, per confermare che il reset del ref al logout non lascia un profilo "incollato" da una sessione precedente

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Rimuovere il doppio fetch iniziale | Eliminare la chiamata separata a `supabase.auth.getSession()` nell'effect, affidandosi solo all'evento `INITIAL_SESSION` emesso da `onAuthStateChange` alla sottoscrizione | Impl | - |
| TODO | TASK-02 | Guardia anti-refetch su user id invariato | Introdurre un `useRef` con l'ultimo `user.id` fetchato; nel callback di `onAuthStateChange`, aggiornare sempre `session` ma saltare `fetchProfile` se l'id utente non è cambiato | Impl | TASK-01 |
| TODO | TASK-03 | Deferire la fetch fuori dal callback sincrono | Avvolgere la chiamata a `fetchProfile` in un `setTimeout(() => {...}, 0)` dentro il listener di `onAuthStateChange`, secondo la linea guida Supabase per evitare l'interferenza con il lock interno del client auth | Impl | TASK-01 |
| TODO | TASK-04 | Reset della guardia al logout | Azzerare il ref dell'ultimo user id quando l'evento riporta sessione nulla, così un login successivo forza sempre un fetch fresco del profilo | Impl | TASK-02 |
| TODO | TASK-05 | Verifica manuale golden path | Login, navigazione tra almeno due pagine protette, osservazione di console e network tab per 10+ secondi di inattività: nessun errore "Maximum update depth exceeded", nessuna richiesta ripetuta verso `profiles` | Test | TASK-01, TASK-02, TASK-03, TASK-04 |
| TODO | TASK-06 | Verifica cambio utente e refresh sessione | Logout e login con un secondo utente di ruolo diverso per confermare il caricamento del profilo corretto; verificare che un refresh di sessione a utente invariato non generi un nuovo fetch | Test | TASK-02, TASK-04 |

---

_Piano generato via Archetipo Planning — 2026-07-24_
