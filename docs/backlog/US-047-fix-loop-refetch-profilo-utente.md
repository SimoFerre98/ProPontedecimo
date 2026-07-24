# US-047: Fix loop di refetch del profilo utente dopo il login

**Epic:** EP-014 — Refactoring Architetturale & Resilienza | **Priority:** MEDIUM | **Story Points:** 2 | **Scope:** MVP

**Story**
Come utente autenticato,
voglio che l'applicazione recuperi il mio profilo una sola volta dopo il login,
così che l'app non generi centinaia di richieste ridondanti e non sprechi banda/risorse del progetto Supabase.

**Demonstrates**
After implementing this story, the user can: fare login, navigare tra più pagine protette e osservare (network tab) che `profiles` viene interrogato solo quando serve realmente (login, refresh di sessione, cambio utente), non in loop continuo.

**Acceptance Criteria**
- [ ] Dopo il login, la console del browser non mostra più l'errore React "Maximum update depth exceeded"
- [ ] Il network tab non mostra più richieste ripetute e ravvicinate verso `GET .../rest/v1/profiles?...id=eq.<uid>` a fronte della stessa sessione utente invariata
- [ ] Il comportamento è verificato manualmente: login, navigazione tra almeno due pagine protette, nessun loop osservato per almeno 10 secondi di inattività

**Context**
Emerso durante la verifica manuale end-to-end di US-033 (2026-07-21): dopo il login, il browser scatena centinaia di richieste identiche a `GET http://127.0.0.1:54321/rest/v1/profiles?select=id,email,full_name,role,avatar_url&id=eq.<uid>` in rapida successione, e la console React mostra ripetutamente "Maximum update depth exceeded. This can happen when a component calls setState inside useEffect...". **Riprodotto identicamente anche su un checkout pulito del branch `dev`**, quindi bug pre-esistente non introdotto da US-033.

Sospetto principale: `src/contexts/AuthContext.tsx` (o l'hook `useAuth` in `src/hooks/useAuth.ts`) — probabilmente un `useEffect` che rifetcha il profilo ad ogni cambio di stato di autenticazione (es. `onAuthStateChange`) senza una dipendenza stabile, causando setState → re-render → nuovo fetch → setState in loop.

Riproduzione: avviare il dev server con Supabase locale attivo, fare login con un utente qualsiasi, navigare tra un paio di pagine protette lasciando il browser aperto per qualche secondo. Aprire console/network tab: si osservano centinaia di GET identiche verso `profiles` e l'errore "Maximum update depth exceeded" nella console.

Impatto: nell'uso normale non blocca visibilmente la UI (React continua a renderizzare), ma genera un carico di rete enorme con rischio di rallentamento percepibile o superamento di rate limit su Supabase in produzione.

**Status:** DONE
**Plan:** [docs/planning/US-047-plan.md](../planning/US-047-plan.md)
