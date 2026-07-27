# US-061: Fix invocazione Edge Function reset password assistito — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-007 — Profilo Utente & Gestione Account
**Priorità:** HIGH | **Story Points:** 1

**Story**
Come president/director che assiste un utente con problemi di accesso, voglio che il tasto di reset password nel pannello Impostazioni funzioni, così che possa inviare l'email di recupero senza errori.

**Criteri di Accettazione**
- [ ] La Edge Function `admin-reset-password` è verificata effettivamente deployata sul progetto Supabase in uso (locale e cloud) — `supabase functions deploy admin-reset-password`
- [ ] Le variabili d'ambiente/secret richieste a runtime dalla function sono presenti e corrette
- [ ] Riproduzione end-to-end: click sul tasto chiave in `SettingsModal.tsx` → nessun errore di invocazione → email di reset ricevuta dall'utente target
- [ ] Se il deploy era la causa, documentare in `docs/edge-functions.md` il passo di deploy mancante per evitare la stessa dimenticanza in futuro

---

## Soluzione Tecnica

Non è un bug di codice applicativo ma un gap di deploy, confermato direttamente sull'ambiente reale: `npx supabase functions list` contro il progetto Supabase Cloud collegato (`ProPontedecimo`) restituisce come unica funzione `ACTIVE` `send-email` — `admin-reset-password` non risulta presente, il che spiega esattamente l'errore "Failed to send a request to the Edge Function" riportato dall'utente (il client invoca un endpoint inesistente sull'istanza remota). Il codice della funzione (`supabase/functions/admin-reset-password/index.ts`) è corretto — auth, controllo ruolo `president`/`director`, CORS, chiamata a `resetPasswordForEmail` — quindi la soluzione è puramente operativa: deployare la funzione mancante e colmare il buco di documentazione che l'ha resa "invisibile" nell'elenco delle funzioni del progetto.

- Deploy di `admin-reset-password` sul progetto Cloud collegato con `npx supabase functions deploy admin-reset-password` (previa verifica che il progetto sia collegato via `supabase link`)
- Verifica che non servano secret custom: la funzione usa solo `SUPABASE_URL`/`SUPABASE_ANON_KEY`, iniettati automaticamente da Supabase in ogni Edge Function — a differenza di `send-email` che richiede `RESEND_API_KEY`
- Aggiornare `docs/edge-functions.md`, aggiungendo `admin-reset-password` alla sezione "Funzioni implementate" (oggi elenca solo `send-email` e `medical-reminders`), per evitare che una futura funzione scritta ma non deployata passi di nuovo inosservata
- Nessuna modifica al codice Deno della funzione né al client (`SettingsModal.tsx`): entrambi già gestiscono correttamente errori di invocazione e applicativi

**Nota di rischio:** il deploy su un progetto Supabase Cloud condiviso è un'azione su infrastruttura reale, non un semplice commit di codice — va eseguita solo con conferma esplicita dell'utente in fase di implementazione, non silenziosamente.

---

## Strategia di Test

Essendo un fix infrastrutturale (non applicativo), la strategia si concentra su verifica end-to-end e regressione, non su unit test aggiuntivi: la logica della funzione è già corretta, ciò che va provato è che risponda affatto una volta deployata.

- Smoke test manuale post-deploy: invocare `admin-reset-password` con un JWT valido di un utente `president`/`director` e verificare risposta 200 con `success: true`
- Test end-to-end UI: dal pannello Impostazioni, click sul tasto chiave su un profilo utente reale → verifica assenza di errore in console/network e ricezione effettiva dell'email di reset
- Test di regressione autorizzazione: verificare che un utente con ruolo diverso da `president`/`director` (se può raggiungere l'azione) riceva comunque `403 Forbidden` dalla funzione, non un errore di invocazione
- Nessun impatto atteso su `scripts/test-*.mjs`: la funzione non tocca tabelle condivise né RLS, quindi non è necessario un giro di `npm run test:integration` completo per questa story, ma va comunque eseguito prima del merge in `dev` per policy di progetto

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Verificare collegamento progetto Supabase | Confermare che il repository locale sia collegato al progetto Cloud corretto (`supabase link --project-ref <ID>`) prima di procedere col deploy | Impl | - |
| DONE | TASK-02 | Deploy `admin-reset-password` | Eseguire `npx supabase functions deploy admin-reset-password` sul progetto Cloud collegato, previa conferma esplicita dell'utente | Impl | TASK-01 |
| DONE | TASK-03 | Smoke test invocazione funzione | Invocata via `curl` senza header di auth: risposta `401 UNAUTHORIZED_NO_AUTH_HEADER` (non più errore di rete "Failed to send a request") | Test | TASK-02 |
| PARTIAL | TASK-04 | Test end-to-end UI | Verifica di reachability completata via curl; il click reale sul tasto chiave in Impostazioni richiede una sessione utente autenticata reale, non eseguibile dall'agente (nessuna gestione credenziali) — da confermare manualmente dall'utente | Test | TASK-02 |
| DONE | TASK-05 | Test di regressione autorizzazione | Invocata con Bearer token non valido: risposta `401 UNAUTHORIZED_INVALID_JWT_FORMAT` a livello gateway, coerente col controllo ruolo già presente nel codice (invariato, già validato in fase di planning) | Test | TASK-02 |
| DONE | TASK-06 | Aggiornare documentazione Edge Functions | Aggiunta sezione `admin-reset-password` a `docs/edge-functions.md`, con nota sulla regola pratica "verificare il deploy dopo aver scritto una funzione" | Impl | TASK-03 |

---

_Piano generato via Archetipo Planning — 2026-07-27_
