# US-006: Architettura invio email e template promemoria visite mediche — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-06

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come Dirigente,
voglio che il sistema possa inviare email automatiche tramite Resend e Supabase Edge Functions, a partire dai promemoria per le visite mediche in scadenza,
così che le famiglie siano avvisate in tempo senza solleciti manuali.

**Criteri di Accettazione**
- [ ] Una Edge Function invoca Resend e invia correttamente un'email di test
- [ ] Il template grafico del promemoria visite mediche è definito e coerente con l'identità visiva della società
- [ ] L'architettura (trigger, scheduling, gestione errori di invio) è documentata per i futuri casi d'uso email
- [ ] Un invio fallito viene registrato e non blocca l'applicazione

---

## Soluzione Tecnica

Scoperta chiave dell'analisi: il frontend **già invoca** `supabase.functions.invoke('send-email', ...)` in `SendEmailModal.tsx`, ma nel repository **non esiste alcuna Edge Function** (`supabase/functions/` è assente). La funzione o vive solo sul cloud non versionata, o non esiste e gli invii falliscono. Questa story mette ordine: versiona le Edge Functions nel repo (ora possibile grazie alla CLI di US-001), consolida `send-email` come funzione di invio generica su Resend, e aggiunge il caso d'uso specifico dei promemoria visite mediche con template brandizzato. Approccio "boring & versionato": tutto sotto `supabase/functions/`, deploy via CLI, segreti fuori dal repo.

- **`supabase/functions/_shared/`**: client Resend minimale (fetch verso `https://api.resend.com/emails`, nessun SDK per restare leggeri sul runtime Deno) + template HTML brandizzati (palette bordeaux/oro, logo società) come funzioni che ritornano stringhe HTML. Un template `medicalReminder({ playerName, expiryDate, daysLeft })` e un layout base riutilizzabile.
- **`supabase/functions/send-email/`**: allinea la funzione al contratto già usato dal frontend (`{ to, subject, html, groupTarget? }` + header Authorization). Verifica il JWT del chiamante e il ruolo (staff), invia via Resend, **registra l'uso in `email_usage`** (già usata dal modale per le quote), e in caso di errore Resend logga e ritorna un errore strutturato senza eccezioni non gestite. Idempotente rispetto allo stato dell'app.
- **`supabase/functions/medical-reminders/`**: funzione dedicata che (a) query degli atleti con `medical_expiry` entro N giorni, (b) compone il template per ciascuno, (c) invia tramite lo stesso client Resend, (d) registra l'esito. Progettata per essere **schedulabile** via `pg_cron`/Supabase Scheduled Functions — lo scheduling effettivo è documentato ma la sua attivazione è fuori scope (si attiva quando le famiglie avranno email verificate in massa).
- **Segreti**: `RESEND_API_KEY` come secret dell'Edge Runtime (mai nel repo); `.env.example` aggiornato con un placeholder documentativo e nota che il secret va impostato con `supabase secrets set`. Mittente: dominio verificato su Resend (a carico di Simone come prerequisito operativo — se non pronto, si usa il dominio sandbox di Resend per il test dell'AC1).
- **Gestione errori (AC4)**: ogni invio è avvolto in try/catch; il fallimento del singolo destinatario non interrompe il batch; l'esito (successo/fallimento + messaggio) è loggato e — dove pertinente — ritornato al chiamante. Il frontend `SendEmailModal` già gestisce `res.error` senza crashare: contratto preservato.
- **Documentazione (AC3)**: nuova sezione in `docs/database.md` (o nuovo `docs/edge-functions.md`) con architettura, flusso di deploy (`supabase functions deploy`), gestione secret, e come attivare lo scheduling futuro dei promemoria.

> ⚠️ **Prerequisiti operativi a carico di Simone** (Gemini li segnalerà se bloccanti): account Resend con API key, e idealmente un dominio mittente verificato. Per l'AC1 (email di test) è sufficiente la sandbox Resend.

---

## Strategia di Test

Story infrastrutturale con una componente verificabile end-to-end (invio reale in sandbox) e il resto per ispezione e non-regressione.

- **Invio di test reale** (e2e manuale, AC1): deploy della funzione `send-email` e invio di un'email di prova a un indirizzo reale via sandbox/dominio Resend — l'email arriva e `email_usage` registra la riga
- **Template** (visivo, AC2): render del template `medicalReminder` con dati di esempio (HTML aperto in browser) — brandizzazione coerente col Premium Glass/identità società, leggibile nei principali client email
- **Gestione errori** (unit/integration, AC4): simulazione di un fallimento Resend (API key errata) → la funzione ritorna errore strutturato, logga, non solleva eccezioni non gestite; nel batch promemoria un destinatario fallito non blocca gli altri
- **Non-regressione frontend** (smoke): `SendEmailModal` continua a funzionare col contratto invariato (invio gruppo/singolo, conteggio quote, gestione `res.error`)
- **Versionamento** (CLI): le funzioni risultano sotto `supabase/functions/` e deployabili; nessun segreto committato

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Client Resend + layout condivisi | Creare `supabase/functions/_shared/` con client Resend (fetch API, no SDK) e layout HTML base brandizzato riutilizzabile. | Impl | - |
| DONE | TASK-02 | Template promemoria visite mediche | Implementare `medicalReminder({ playerName, expiryDate, daysLeft })` sul layout base, palette bordeaux/oro e logo società. | Impl | TASK-01 |
| DONE | TASK-03 | Edge Function `send-email` | Allineare la funzione al contratto usato da `SendEmailModal` (to/subject/html/groupTarget + Authorization), verifica JWT+ruolo staff, invio Resend, log in `email_usage`, errori strutturati. | Impl | TASK-01 |
| DONE | TASK-04 | Edge Function `medical-reminders` | Funzione che seleziona gli atleti con `medical_expiry` entro N giorni, compone il template (TASK-02) e invia via client Resend, registrando l'esito; predisposta per scheduling. | Impl | TASK-02, TASK-03 |
| DONE | TASK-05 | Config secret e .env.example | Documentare/impostare `RESEND_API_KEY` come secret Edge Runtime; aggiornare `.env.example` con placeholder e nota `supabase secrets set`. | Impl | TASK-03 |
| DONE | TASK-06 | Test invio + errori | Invio di test reale in sandbox (AC1) con verifica riga `email_usage`; test di fallimento Resend (AC4: errore strutturato, nessun crash, batch resiliente). | Test | TASK-04, TASK-05 |
| DONE | TASK-07 | Non-regressione SendEmailModal | Smoke sul modale email esistente: invio gruppo/singolo e gestione errori col contratto invariato. | Test | TASK-03 |
| DONE | TASK-08 | Documentazione architettura | Sezione dedicata (docs/edge-functions.md o in docs/database.md): architettura, deploy, secret, scheduling futuro dei promemoria. | Impl | TASK-06 |

---

_Piano generato via Archetipo Planning — 2026-07-06_
