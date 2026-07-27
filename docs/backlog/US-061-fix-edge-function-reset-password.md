# US-061: Fix invocazione Edge Function reset password assistito

**Epic:** EP-007 — Profilo Utente & Gestione Account | **Priority:** HIGH | **Story Points:** 1 | **Scope:** MVP

**Story**
Come president/director che assiste un utente con problemi di accesso,
voglio che il tasto di reset password nel pannello Impostazioni funzioni,
così che possa inviare l'email di recupero senza errori.

**Demonstrates**
After implementing this story, the user can: cliccare il tasto "chiave" (reset password) su un utente in Impostazioni e vedere l'email di recupero inviata correttamente, senza l'errore "Failed to send a request to the Edge Function".

**Acceptance Criteria**
- [ ] La Edge Function `admin-reset-password` è verificata effettivamente deployata sul progetto Supabase in uso (locale e cloud) — `supabase functions deploy admin-reset-password`
- [ ] Le variabili d'ambiente/secret richieste a runtime dalla function sono presenti e corrette
- [ ] Riproduzione end-to-end: click sul tasto chiave in [SettingsModal.tsx](../../src/components/modals/SettingsModal.tsx) → nessun errore di invocazione → email di reset ricevuta dall'utente target
- [ ] Se il deploy era la causa, documentare in `docs/edge-functions.md` il passo di deploy mancante per evitare la stessa dimenticanza in futuro

**Context**
Analisi del codice (2026-07-27): il bottone ([SettingsModal.tsx:523-541](../../src/components/modals/SettingsModal.tsx)) invoca correttamente `admin-reset-password` (nome coincidente con la cartella `supabase/functions/admin-reset-password/`), CORS e gestione ruoli nella function sono corretti, e non c'è mismatch di naming. L'errore "Failed to send a request to the Edge Function" è tipico di `supabase-js` quando la richiesta di rete stessa fallisce (funzione non deployata sull'istanza collegata, o crash al boot) — non un errore applicativo, che arriverebbe come risposta HTTP gestita separatamente nel codice. La causa più probabile, non verificabile da codice sorgente, è un problema di deploy/ops da confermare manualmente.

**Status:** IN PROGRESS
**Plan:** [docs/planning/US-061-plan.md](../planning/US-061-plan.md)
