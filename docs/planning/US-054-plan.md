# US-054: Guida — Profilo, Account e Ruoli — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come utente di qualsiasi ruolo, voglio un capitolo della guida su come modificare i miei dati personali e cambiare la password, e — se presidente — su come assistere il recupero password o assegnare un ruolo, con screenshot, così che possa gestire l'account senza commettere errori.

**Criteri di Accettazione**
- [ ] È documentato con screenshot come modificare i propri dati personali, email e password dalla sezione profilo (vedi US-018)
- [ ] È documentato, per il ruolo presidente, come assistere un utente nel recupero password (vedi US-019) e come assegnare o modificare un ruolo (vedi US-020)
- [ ] È spiegato in linguaggio semplice perché alcune azioni (es. il cambio di ruolo) sono riservate solo al presidente

---

## Soluzione Tecnica

Nessuna modifica al database. Il profilo utente (`ProfileModal.tsx`) è comune a Staff e Portale, quindi `audience: 'both'`; la sezione sulla gestione utenti (`SettingsModal.tsx`, riservata al presidente) è mostrata sempre nel contenuto — è testo informativo, non un controllo interattivo reale, quindi non richiede una variante separata (un genitore la legge sapendo che non lo riguarda, coerente con come già gestito in altri capitoli).

- Nuovo componente `src/components/guide/chapters/ProfiloAccountRuoliChapter.tsx` con 3 sezioni verificate contro il codice reale: (1) sezione "Cambia password" collassabile e il pulsante "Salva modifiche" di `ProfileModal.tsx`; (2) pannello "Gestione Utenti" di `SettingsModal.tsx` — pulsante con icona chiave "Invia email di reset password" e selettore di ruolo (Presidente/Direttore/Allenatore/Genitore/Giocatore); (3) spiegazione in linguaggio semplice del perché il cambio di ruolo è riservato al presidente (evitare che un utente si assegni da solo permessi più ampi — vedi il trigger anti-escalation di US-002/US-020).
- Aggiornare l'entry `profilo-account-ruoli` in `guideChapters.tsx`: `status: 'available'`, `audience: 'both'`, `Component: ProfiloAccountRuoliChapter`.

---

## Strategia di Test

Nessuna suite `scripts/test-*.mjs` interessata. `npx tsc --noEmit` per questa story; `npm run test:integration` e verifica manuale eseguiti una sola volta al termine della batch EP-015.

---

## Task di Implementazione

| Stato | # | Task | Descrizione |
|---|---|---|---|
| DONE | TASK-01 | Componente `ProfiloAccountRuoliChapter.tsx` | Creare il capitolo con le 3 sezioni (cambio password, gestione utenti/reset/ruoli, perché il cambio ruolo è riservato) |
| DONE | TASK-02 | Registrazione capitolo | `status: 'available'`, `audience: 'both'`, `Component: ProfiloAccountRuoliChapter` |

---

_Piano generato via Archetipo Planning — 2026-07-27_
