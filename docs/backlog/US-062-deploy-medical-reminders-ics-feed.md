# US-062: Deploy Edge Function medical-reminders e ics-feed su Supabase Cloud

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** HIGH | **Story Points:** 1 | **Scope:** MVP

**Story**
Come utente del gestionale,
voglio che i promemoria delle visite mediche (US-006) e il feed di sincronizzazione calendario (US-014) funzionino realmente in produzione,
così che feature già segnate DONE nel backlog non risultino di fatto inattive per un gap di deploy mai verificato.

**Demonstrates**
After implementing this story, the user can: verificare che `medical-reminders` e `ics-feed` rispondano correttamente quando invocate sul progetto Supabase Cloud, invece di fallire silenziosamente perché mai deployate.

**Acceptance Criteria**
- [x] `medical-reminders` verificata `ACTIVE` su `npx supabase functions list` contro il progetto Cloud collegato
- [x] `ics-feed` verificata `ACTIVE` su `npx supabase functions list` contro il progetto Cloud collegato
- [x] Secret `RESEND_API_KEY` (richiesto da `medical-reminders`) confermato presente su `npx supabase secrets list`
- [x] Smoke test di raggiungibilità per entrambe (risposta applicativa, non errore di rete/gateway)
- [x] `docs/edge-functions.md` aggiornato con la sezione `ics-feed` (mancante) e una nota sul gap di deploy comune alle tre funzioni scoperte finora (`admin-reset-password`, US-061)
- [ ] Verifica end-to-end con invio reale di un'email di promemoria visita medica e di un feed iCal valido per un utente reale — non eseguibile dall'agente senza un token/JWT reale, da confermare manualmente

**Context**
Scoperta collaterale durante la code review di US-061: `npx supabase functions list` contro il progetto Cloud (`propontedecimo`) mostrava come `ACTIVE` solo `send-email`, nonostante `medical-reminders` (US-006) e `ics-feed` (US-014) siano scritte da tempo e segnate `DONE` nel backlog con test di integrazione verdi in locale. Stesso pattern esatto del bug di US-061: funzione scritta e testata in locale, mai effettivamente deployata sul progetto Cloud collegato.

Deploy eseguito (2026-07-27): entrambe le funzioni ora `ACTIVE`. Smoke test:
- `medical-reminders` senza header di auth → `401 UNAUTHORIZED_NO_AUTH_HEADER` (gateway raggiunge la funzione, comportamento atteso vista `verify_jwt = true` di default)
- `ics-feed` senza `token` e con `token` UUID-valido-ma-inesistente → `404 Not Found` in entrambi i casi, comportamento intenzionale del codice (righe 24-29 e 70-75 di `index.ts`), non un errore di rete

Non è stato possibile testare l'invio reale di un'email o la generazione di un feed `.ics` per un profilo reale, perché richiederebbe un JWT/token utente reale che l'agente non genera per policy (nessuna gestione di credenziali).

**Status:** REVIEW
