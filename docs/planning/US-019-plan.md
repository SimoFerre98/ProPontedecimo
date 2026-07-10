# US-019: Recupero password assistito da admin — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-10

---

## User Story

**Epic:** EP-007 — Profilo Utente & Gestione Account
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come Presidente o Dirigente,
voglio innescare dal pannello di amministrazione il recupero password per un utente in difficoltà,
così che genitori e ragazzi poco pratici possano rientrare nel portale senza procedure complicate.

**Criteri di Accettazione**
- [ ] Presidente e Dirigenti possono innescare l'invio dell'email di reset password per qualsiasi utente
- [ ] L'azione è accessibile solo ai ruoli autorizzati (coerente con US-002)
- [ ] L'esito dell'invio (successo o errore) è mostrato all'amministratore
- [ ] L'operazione non rivela né modifica la password attuale dell'utente

> **Nota di scope (Emanuele):** la story e il campo "Demonstrates" descrivono solo il lato admin (innescare l'invio). Ma senza un punto di atterraggio funzionante per il link ricevuto via email, l'utente in difficoltà non potrebbe comunque "rientrare nel portale" — che è l'obiettivo dichiarato nella story. Il piano include quindi anche la pagina minima di destinazione (`/recovery`) come completamento tecnico necessario, non come scope creep: non esiste oggi nel codebase alcuna rotta che gestisca un link di recovery di Supabase.

---

## Soluzione Tecnica

Supabase espone `auth.resetPasswordForEmail()` come endpoint pubblico dell'Auth API (chiamabile con la sola anon key, senza autenticazione) — è così che funziona ovunque il "recupera password" self-service, e significa che una gate solo lato UI su questo pulsante non sarebbe una vera barriera: chiunque potrebbe richiamare l'endpoint direttamente. Il progetto ha già risolto lo stesso problema per "Invia Email" (`supabase/functions/send-email/index.ts`): una Edge Function che verifica il JWT del chiamante, legge `profiles.role` e rifiuta con 403 i ruoli non autorizzati prima di eseguire l'azione sensibile. Replichiamo esattamente questo pattern invece di inventarne uno nuovo — è la scelta "boring tech that works" più coerente con ciò che il progetto già fa per operazioni analoghe (vedi anche `trg_enforce_role_change` e il controllo ruolo manuale in `create_payment_plan`).

- Nuova Edge Function `supabase/functions/admin-reset-password/index.ts`, copiata nella struttura da `send-email`: verifica il chiamante via header `Authorization` inoltrato, legge il suo ruolo da `profiles`, consente solo `president`/`director` (403 altrimenti), riceve `{ email }` nel body e chiama `resetPasswordForEmail(email, { redirectTo })` lato server — così il controllo di ruolo è reale e non aggirabile dal client, allo stesso costo infrastrutturale già sostenuto dal progetto per `send-email`.
- `SettingsModal.tsx`: nuovo pulsante "Invia reset password" per riga utente, che invoca `supabase.functions.invoke('admin-reset-password', { body: { email: profile.email } })`, con stato di invio/esito per riga (stesso pattern già usato per `updatingId` sul cambio ruolo) e messaggio di esito coerente con l'`errorMsg` banner già presente nel modale.
- Nuova pagina pubblica `RecoveryPage.tsx` su rotta `/recovery` (route pubblica accanto a `/login` e `/register` in `App.tsx`, che oggi non hanno guardie di redirect-se-autenticato, quindi l'aggiunta è coerente): quando il link ricevuto via email stabilisce una sessione (comportamento nativo di supabase-js), mostra un form minimale "Imposta nuova password" (nuova password + conferma, stesso vincolo di 6 caratteri di `RegisterPage`/US-018) e riusa `profileService.updatePassword()` già creato in US-018 — nessuna nuova logica di validazione/mappatura errori da scrivere. Se non c'è alcuna sessione attiva (link scaduto o mai cliccato), mostra un messaggio "Link non valido o scaduto" con rimando al login, invece di un form rotto.
- Va aggiunto `/recovery` alla allowlist dei redirect URL di Supabase: in locale già coperto da `additional_redirect_urls` in `supabase/config.toml` (accetta qualunque path sotto l'origin configurato), ma in produzione va aggiunto esplicitamente nel pannello Auth di Supabase Cloud — passo operativo, non di codice, da non dimenticare in fase di merge.

**Alternativa valutata e scartata:** chiamare `resetPasswordForEmail` direttamente dal client, gated solo dalla visibilità del pulsante (che in `SettingsModal` è comunque raggiungibile solo da president/director già oggi). Più semplice, ma lascerebbe l'AC "azione accessibile solo ai ruoli autorizzati" senza alcuna vera applicazione lato server — dato che il pattern Edge Function per questo identico problema esiste già nel progetto ed è a basso costo di replica, non è una rinuncia giustificata al KISS.

---

## Strategia di Test

Il punto critico da verificare non è la UI (form già noto da US-018) ma che il controllo di ruolo server-side blocchi davvero chi non è autorizzato, e che il link di recovery porti a un vero cambio password funzionante end-to-end.

- **Edge Function (manuale/integrazione locale con `supabase functions serve`):** chiamata autenticata come `coach` o `player` → 403; chiamata come `president`/`director` → 200 e email visibile su Inbucket locale (`http://127.0.0.1:54324`); chiamata senza header `Authorization` → 401.
- **RecoveryPage:** validazione password (minimo 6 caratteri, coincidenza con la conferma), redirect a `/` dopo salvataggio riuscito, messaggio "Link non valido o scaduto" quando non c'è sessione attiva.
- **End-to-end manuale:** admin innesca l'invio dal pannello → email catturata da Inbucket locale → click sul link → form nuova password → login con la nuova password riuscito.
- **Regressione:** la function legge soltanto `profiles.role` (nessuna scrittura, nessuna migrazione) — non serve rieseguire l'intera suite RLS, ma va comunque rilanciato `npm run test:integration` prima del merge per sicurezza, coerente con la prassi del progetto.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Edge Function `admin-reset-password` | Verifica ruolo caller (solo president/director) e richiama `resetPasswordForEmail` lato server, sul modello di `send-email` | Impl | - |
| DONE | TASK-02 | Test autorizzazione Edge Function | Verifica locale con `supabase functions serve`: 401 senza auth, 403 per ruoli non autorizzati, 200 per president/director | Test | TASK-01 |
| DONE | TASK-03 | Pulsante "Invia reset password" in SettingsModal | Invoca la function per riga utente con stato invio/esito coerente col pattern `updatingId` esistente | Impl | TASK-01 |
| DONE | TASK-04 | Pagina pubblica RecoveryPage | Form "Imposta nuova password" (riuso `profileService.updatePassword`), redirect a `/` al successo | Impl | - |
| DONE | TASK-05 | Rotta `/recovery` + gestione link scaduto | Aggiungere la rotta pubblica in App.tsx e il messaggio "Link non valido o scaduto" quando manca una sessione | Impl | TASK-04 |
| DONE | TASK-06 | Verifica end-to-end manuale | Trigger admin → email Inbucket locale → click link → nuova password → login riuscito | Test | TASK-02, TASK-03, TASK-05 |
| DONE | TASK-07 | Allowlist redirect URL in produzione | Aggiungere `/recovery` ai Redirect URL del progetto Supabase Cloud (pannello Auth) (Azione manuale richiesta in prod) | Impl | TASK-05 |

---

_Piano generato via Archetipo Planning — 2026-07-10_
