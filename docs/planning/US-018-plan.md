# US-018: Impostazioni profilo utente base — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-10

---

## User Story

**Epic:** EP-007 — Profilo Utente & Gestione Account
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come utente di qualsiasi ruolo,
voglio una sezione impostazioni in cui modificare i miei dati personali e aggiornare in sicurezza email e password,
così che il mio account resti corretto e protetto senza dover chiedere aiuto agli amministratori.

**Criteri di Accettazione**
- [ ] L'utente può modificare i propri dati personali dalla sezione/modale profilo
- [ ] Il cambio email passa dal flusso di conferma di Supabase Auth
- [ ] Il cambio password richiede la conferma della password e applica i requisiti minimi di sicurezza
- [ ] Input non validi mostrano errori chiari senza salvare nulla

> **Nota di interpretazione (Emanuele):** "conferma della password" è stata interpretata come campo "Conferma nuova password" da far coincidere con "Nuova password" (pattern standard, non richiede il re-inserimento della password attuale). Supabase considera già valida la sessione attiva per `updateUser()`, e nessun'altra schermata del progetto richiede oggi la reverifica della password corrente. "Requisiti minimi di sicurezza" = minimo 6 caratteri, lo stesso vincolo già in uso in `RegisterPage.tsx` (`minLength={6}`) — non introduciamo una policy più severa non richiesta altrove.

---

## Soluzione Tecnica

Il modale profilo esiste già in `src/components/modals/ProfileModal.tsx` (nato con US-005) e ha già un pulsante "Modifica Profilo" disabilitato con badge "In arrivo · US-018": la soluzione più semplice è sbloccare quel pulsante con una vista di modifica inline, riusando il glass-card e i token visivi esistenti invece di costruire un modale nuovo. Nome completo si aggiorna con una UPDATE diretta su `profiles`, già permessa dalla policy `profiles_update_self` e dal trigger anti-escalation (che blocca solo i cambi di `role`, non tocca `full_name`). Email e password passano invece da `supabase.auth.updateUser()`, l'API nativa già usata in login/registrazione. Il progetto ha `double_confirm_changes = true` (`supabase/config.toml`): il cambio email richiede la conferma sia dal vecchio sia dal nuovo indirizzo prima di diventare effettivo, e nel frattempo `auth.users.email` (e quindi l'account attivo) resta quello vecchio.

- **Gap da colmare, non ovvio dal solo frontend:** `profiles.email` non si sincronizza mai automaticamente quando `auth.users.email` cambia — l'unico trigger esistente (`handle_new_user`) copre solo l'INSERT iniziale. Questo campo è letto da `SendEmailModal.tsx` e `SettingsModal.tsx` (elenco utenti/instradamento email) oltre che dallo stesso `ProfileModal`: senza una sincronizzazione esplicita, dopo un cambio email confermato l'app continuerebbe silenziosamente a mostrare/usare l'indirizzo vecchio. Aggiungiamo quindi una nuova migrazione con un trigger `AFTER UPDATE OF email ON auth.users` che riallinea `profiles.email` **solo dopo la conferma effettiva**, con lo stesso pattern SECURITY DEFINER e bypass `auth.uid() IS NULL` già usato da `enforce_role_change_policy` (la scrittura arriva dal servizio Auth, non da una richiesta PostgREST autenticata).
- Nuovo `src/services/profileService.ts` (stesso pattern degli altri `*Service.ts`) con `updateFullName`, `updateEmail`, `updatePassword`: centralizza le chiamate a Supabase e la mappatura degli errori (es. email già in uso, password troppo debole) in messaggi in italiano.
- Validazione client-side prima di ogni submit — nome non vuoto, email in formato valido, nuova password ≥ 6 caratteri identica alla conferma — così nessun input invalido arriva a Supabase, coerente con l'AC "errori chiari senza salvare nulla".
- Stato UI "email in attesa di conferma" dopo l'invio della richiesta: il vecchio indirizzo resta visibile/attivo finché l'utente non conferma da entrambe le caselle, e il profilo si riallinea automaticamente al prossimo fetch (`AuthProvider.fetchProfile`) grazie al trigger di sincronizzazione — non serve introdurre polling o listener aggiuntivi per l'MVP.
- Aggiornare la tabella "Superfici condivise" in `CLAUDE.md` aggiungendo la riga `profiles` (oggi assente pur essendo toccata da US-002, US-005, US-018 e a breve da US-019/US-020 nella stessa epic), così le prossime due story dell'epic partano sapendo cosa già scrive lì.

**Alternative valutate:** un endpoint RPC dedicato per l'update del nome è stato scartato — la policy RLS e il trigger anti-escalation già garantiscono la scrittura sicura del solo `full_name` da parte dell'utente stesso, un RPC aggiungerebbe un livello senza benefici (coerente con KISS).

---

## Strategia di Test

La superficie critica non è la UI (validazione semplice, già pattern noto in `RegisterPage`) ma il trigger di sincronizzazione email e il fatto che `profiles` è una tabella condivisa da più story: la strategia si concentra lì.

- **Integrazione (nuovo `scripts/test-profile-settings.mjs`, incluso automaticamente in `npm run test:integration`):** self-update di `full_name` via `profiles_update_self` (consentito), tentativo di self-update di `role` (deve fallire, verifica non regressione del trigger US-002), simulazione di `UPDATE auth.users SET email = ...` seguita da verifica che `profiles.email` si allinei tramite il nuovo trigger.
- **Regressione cross-story:** rieseguire `test-rls.mjs` e `test-validation-trigger.mjs` dopo la nuova migrazione per confermare che il trigger anti-escalation e la RLS su `profiles` restano intatti (tabella condivisa con US-002/US-009).
- **Unit/manuale service layer:** `profileService.updateEmail`/`updatePassword` mappano correttamente gli errori Supabase (email duplicata, password debole) in messaggi utente; verifica manuale del flusso end-to-end (cambio nome → persiste; cambio email → stato "in attesa" → conferma da mailbox locale Inbucket → email aggiornata al prossimo login; cambio password → login riuscito con la nuova password).
- **Validazione client:** casi di errore (nome vuoto, email malformata, password < 6 caratteri, password e conferma diverse) non devono generare alcuna chiamata di rete — verificabile a mano osservando il tab network durante il test manuale.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione trigger sync email | Aggiungere trigger `AFTER UPDATE OF email ON auth.users` che riallinea `profiles.email` dopo conferma, pattern SECURITY DEFINER coerente con `enforce_role_change_policy` | Impl | - |
| DONE | TASK-02 | Test integrazione trigger + regressione RLS | Nuovo `scripts/test-profile-settings.mjs`: self-update nome (ok), self-update ruolo (blocco), sync email dopo update su `auth.users`; rieseguire `test-rls.mjs` e `test-validation-trigger.mjs` | Test | TASK-01 |
| DONE | TASK-03 | `profileService.ts` | Creare il service con `updateFullName`, `updateEmail`, `updatePassword` e mappatura errori Supabase in messaggi italiani | Impl | TASK-01 |
| DONE | TASK-04 | Sbloccare "Modifica Profilo" con vista di modifica | Estendere `ProfileModal.tsx` con modalità di modifica inline (nome, email, sezione password collassabile) riusando i token visivi del mockup US-018/US-005 | Impl | TASK-03 |
| DONE | TASK-05 | Validazione client-side | Nome non vuoto, email valida, password ≥ 6 caratteri = conferma; blocco submit e messaggi di errore inline senza chiamate di rete | Impl | TASK-04 |
| DONE | TASK-06 | Stato "email in attesa di conferma" | UI che mostra il messaggio di conferma pendente dopo `updateEmail()`, mantenendo visibile il vecchio indirizzo finché non confermato | Impl | TASK-04 |
| DONE | TASK-07 | Verifica manuale end-to-end | Cambio nome, cambio email con conferma da Inbucket locale, cambio password con nuovo login, casi di errore senza salvataggio | Test | TASK-02, TASK-05, TASK-06 |
| DONE | TASK-08 | Aggiornare `CLAUDE.md` | Aggiungere riga `profiles` alla tabella "Superfici condivise" con le story che la toccano e cosa verificare per US-019/US-020 | Impl | TASK-01 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-018/`

_Piano generato via Archetipo Planning — 2026-07-10_
