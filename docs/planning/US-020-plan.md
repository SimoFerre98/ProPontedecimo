# US-020: Assegnazione ruoli dal pannello impostazioni — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-10

---

## User Story

**Epic:** EP-007 — Profilo Utente & Gestione Account
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come Presidente,
voglio assegnare e modificare i ruoli degli utenti (Dirigente, Allenatore, Giocatore, Genitore) dal pannello impostazioni,
così che i permessi dello staff riflettano sempre l'organizzazione reale della società.

**Criteri di Accettazione**
- [ ] Solo il Presidente può assegnare o modificare i ruoli
- [ ] Il cambio ruolo ha effetto sui permessi dell'utente (RLS di US-002) senza interventi manuali sul database
- [ ] L'interfaccia impedisce al Presidente di rimuovere il proprio ruolo di super admin lasciando il sistema senza amministratori

> **Nota di scope (Emanuele):** questa story arriva a piano dopo che US-002, US-018 e US-019 hanno già costruito buona parte dell'infrastruttura necessaria. `SettingsModal.tsx` espone già un selettore di ruolo per riga utente che chiama `supabase.from('profiles').update({ role })`, e il trigger `trg_enforce_role_change` (da US-002) blocca già a livello database qualunque cambio ruolo tentato da un utente diverso dal Presidente — con test di regressione già verde in `scripts/test-rls.mjs` ("director NON può cambiare ruoli"). Anche l'AC3 è già coperto: il selettore è `disabled` quando `profile.id === user?.id`, quindi nessuno (Presidente incluso) può cambiare il proprio ruolo dalla UI. Il gap reale è solo nell'AC1: il pulsante "Gestione Account" che apre il modale è visibile sia a `president` sia a `director` (necessario per US-019, dove il Dirigente deve poter innescare i reset password), e dentro il modale il selettore di ruolo è oggi interattivo per chiunque acceda — quindi un Dirigente può tentare un cambio ruolo dalla UI, che il database rifiuta silenziosamente con un errore generico ("Errore durante l'aggiornamento del ruolo"), senza spiegare perché. La UI non riflette oggi il vincolo che il database già applica. Il piano quindi non introduce nuove regole di dominio, ma allinea l'interfaccia al vincolo esistente — coerente con la sezione "Superfici condivise" di CLAUDE.md, che impone di verificare chi altro scrive su `profiles` prima di aggiungere qualunque cosa.

---

## Soluzione Tecnica

📐 **Leonardo:** Non serve nessuna nuova migrazione, RPC o policy: il vincolo di dominio ("solo il Presidente cambia i ruoli") esiste già ed è quello giusto — è imposto da `trg_enforce_role_change`, cheè la superficie condivisa su `profiles` toccata anche da US-018/US-019. Aggiungere un secondo meccanismo lato database sarebbe una duplicazione non richiesta da nessun AC. Il gap è puramente di frontend: la UI deve riflettere lo stesso vincolo che il database già applica, invece di lasciare che un Dirigente scopra il blocco solo tentando l'azione e ricevendo un errore generico.

- `SettingsModal.tsx`: il selettore di ruolo (`<select>`) diventa interattivo solo quando `role === 'president'` (valore letto da `useAuth()`, già usato con lo stesso pattern in `DashboardLayout.tsx` per mostrare/nascondere "Gestione Account"). Per chi non è Presidente (oggi solo il Dirigente, che comunque accede al modale per reset password ed eliminazione utenti), la cella mostra il solo badge colorato di ruolo già esistente (`ROLE_COLORS`/`ROLE_LABELS`), senza alcun controllo editabile — nessuna nuova UI da disegnare, si riusa quanto già renderizzato in forma statica accanto al selettore.
- La riga del proprio account resta `disabled` (AC3, comportamento già presente e da preservare), con l'aggiunta di un `title` esplicativo ("Non puoi modificare il tuo stesso ruolo") così l'utente capisce perché è bloccato invece di percepirlo come un bug.
- `handleRoleChange`: se nonostante il gate lato UI il database rifiuta comunque il cambio (caso limite di difesa in profondità: una sessione con ruolo cambiato altrove nel frattempo), il messaggio d'errore in `errorMsg` riporta il testo dell'eccezione sollevata dal trigger (`error.message`, già disponibile nell'oggetto errore di Supabase) invece del messaggio generico attuale — stesso principio di trasparenza già seguito da `mapAuthError` in `profileService.ts`.

🔧 **Ugo:** Cambio a basso rischio: tocchiamo solo `SettingsModal.tsx`, un file già isolato e senza altri consumer. Nessuna migrazione significa nessun `supabase db reset` necessario per questa story specifica, ma va comunque rilanciata la suite di integrazione completa prima del merge perché `profiles` è una superficie condivisa (vedi CLAUDE.md) e non vogliamo scoprire regressioni su US-018/US-019 dopo il merge.

🔎 **Emanuele:** Confermo che la soluzione copre tutti e tre gli AC: il primo con il gate `role === 'president'` sul selettore, il secondo perché il cambio ruolo passa sempre dalla stessa `UPDATE profiles SET role = ...` già letta a runtime da `get_user_role()` nelle policy RLS (nessun passo manuale), il terzo perché il self-lock esistente resta intatto e ora è anche spiegato in UI.

---

## Strategia di Test

🧪 **Mina:** Il punto critico non è il cambio ruolo in sé (già testato da US-002) ma che la UI ora rispecchi correttamente chi può vedere/usare il controllo — quindi il test si concentra sulla visibilità condizionale del selettore e sulla tenuta del self-lock, con una ripassata di regressione sulla suite esistente.

- **Manuale (UI, per ruolo):** login come `president` → il selettore di ruolo è interattivo su ogni riga tranne la propria (badge statico + tooltip); login come `director` → il selettore è sempre un badge statico su ogni riga, nessun controllo editabile visibile.
- **Manuale (self-lock, AC3):** da Presidente, la propria riga mostra il ruolo come badge disabilitato con tooltip esplicativo; non esiste alcun percorso UI per cambiare il proprio ruolo.
- **Manuale (effetto immediato dei permessi, AC2):** Presidente promuove un utente di test a `director`; l'utente promosso, ri-autenticandosi (nuovo JWT/refresh), vede da subito le viste riservate allo staff (es. sezione pagamenti) senza alcun intervento sul database — comportamento già garantito da `get_user_role()` letto a runtime dalle policy RLS.
- **Regressione (obbligatoria pre-merge):** `npx supabase db reset` (nessuna migrazione nuova, ma verifica che nulla si sia rotto) seguito da `npm run test:integration` — in particolare `scripts/test-rls.mjs`, che copre già sia il caso "president può cambiare i ruoli" sia "director NON può cambiare ruoli (anti-escalation)".
- **Type-check:** `npx tsc --noEmit` dopo le modifiche a `SettingsModal.tsx`.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Gate del selettore ruolo al solo Presidente | In `SettingsModal.tsx`, mostrare il `<select>` interattivo solo se `role === 'president'` (da `useAuth()`); per tutti gli altri, badge statico già esistente | Impl | - |
| DONE | TASK-02 | Tooltip sul self-lock (AC3) | Aggiungere `title` esplicativo sulla propria riga quando il controllo è disabilitato perché è il proprio account | Impl | TASK-01 |
| DONE | TASK-03 | Messaggio d'errore trasparente su rifiuto del trigger | In `handleRoleChange`, propagare il testo dell'eccezione del database invece del messaggio generico attuale, come difesa in profondità | Impl | TASK-01 |
| DONE | TASK-04 | Verifica manuale gating per ruolo | Login come `president` e come `director`: confermare visibilità/interattività del selettore coerente col gate introdotto | Test | TASK-01, TASK-02 |
| DONE | TASK-05 | Verifica manuale effetto permessi (AC2) | Promuovere un utente di test, verificarne i nuovi permessi al login successivo senza alcun intervento manuale sul database | Test | TASK-01 |
| DONE | TASK-06 | Regressione completa | `npx supabase db reset` + `npm run test:integration` (in particolare `test-rls.mjs`) + `npx tsc --noEmit` | Test | TASK-01, TASK-02, TASK-03 |

---

_Piano generato via Archetipo Planning — 2026-07-10_
