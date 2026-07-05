# US-005: Allineamento grafico dei modali allo stile Premium Glass — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-05

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come utente della piattaforma,
voglio che tutti i modali abbiano lo stesso stile "Premium Glass" (glassmorfismo, bordi arrotondati, palette bordeaux/oro),
così che l'esperienza visiva sia coerente e raffinata in ogni punto dell'applicazione.

**Criteri di Accettazione**
- [ ] Tutti i modali in `src/components/modals` rispettano il design system Premium Glass (backdrop-blur, `rounded-xl`+, palette bordeaux/oro)
- [ ] `ProfileModal.tsx` è rifattorizzato da placeholder a modale funzionante con i dati del profilo utente
- [ ] I modali sono utilizzabili e leggibili anche su viewport mobile

---

## Soluzione Tecnica

L'audit di conformità sugli 11 modali (3.306 righe totali) ridimensiona il lavoro: la maggior parte è **già largamente conforme** al Premium Glass (classi `glass-card`/`pill`/`backdrop-blur` presenti quasi ovunque, componente condiviso `Modal` in `components/ui/modal.tsx` già in stile). I gap reali sono tre: `ProfileModal` è un placeholder totale (23 righe), tre modali (`DeleteAthleteModal`, `NewPaymentModal`, `PaymentModal`) non hanno vincoli responsive, e la scala dei raggi/overlay non è uniforme. Il riferimento canonico dello stile è `CalendarModal` (overlay `bg-background/60 + backdrop-blur-xl`, `glass-card rounded-[3rem]`, header con box icona e titolo `font-black italic uppercase`, chiusura pill con hover rosso).

- **ProfileModal reale (il grosso della story):** implementazione da mockup su base `Modal` condiviso, con i dati del profilo da `useAuth()` in sola lettura: avatar/iniziali, nome completo, email, badge del ruolo, data registrazione. Pulsante "Modifica Profilo" disabilitato con nota — **l'editing è scope di US-018** (impostazioni profilo), qui solo visualizzazione: confine annotato per evitare sovrapposizioni.
- **Vincoli responsive sui tre modali scoperti:** `w-[95vw] max-w-*` + `max-h-[9xvh]` con scroll interno, come da convenzione già presente negli altri (CHANGELOG 0.8.0).
- **Normalizzazione dei dettagli:** overlay uniforme (`bg-background/60` + `backdrop-blur-xl`), scala raggi coerente (`rounded-[3rem]` contenitore, `rounded-2xl` box interni, pill per i bottoni), micro-hover coerenti.
- **Nessun refactor strutturale:** la migrazione di tutti i modali sul componente `Modal` condiviso e l'hook comune di submit restano scope di US-036/US-037 — qui solo allineamento visivo.
- **⚠️ Sequenza:** questa story tocca file già modificati da US-004 (`SettingsModal`, `SendEmailModal`, `TaskModal`) — **implementare solo dopo il merge di US-004** (e di US-003) su `dev`, per evitare conflitti.

---

## Strategia di Test

Story visiva: la verifica è ispettiva sul dev server, con la fedeltà ai mockup come criterio oggettivo, più i guard-rail di qualità appena conquistati.

- **Fedeltà al mockup** (visiva): `ProfileModal` confrontato con `docs/mockups/US-005/profile-modal.html` — layout, token colore, tipografia, stati
- **Passata visiva completa** (visiva): apertura di tutti gli 11 modali su desktop (1280px) e mobile (375px via resize) — leggibilità, scroll interno, nessun overflow orizzontale
- **Non-regressione funzionale** (smoke): i flussi dei modali toccati (creazione atleta, pagamento, task, email) continuano a funzionare
- **Guard-rail** (tooling): `npm run lint` → 0 problemi e build pulita (lo standard fissato da US-004 non deve regredire)

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | ProfileModal reale | Sostituire il placeholder con il modale profilo da mockup: dati da `useAuth()` (avatar/iniziali, nome, email, badge ruolo, data registrazione), pulsante Modifica disabilitato (scope US-018), base `Modal` condiviso. | Impl | - |
| TODO | TASK-02 | Vincoli responsive mancanti | Aggiungere `w-[95vw]/max-w` e `max-h` con scroll interno a `DeleteAthleteModal`, `NewPaymentModal`, `PaymentModal`. | Impl | - |
| TODO | TASK-03 | Normalizzazione dettagli | Uniformare overlay, scala raggi e hover sugli 11 modali secondo `docs/mockups/US-005/modal-style-tokens.html`. | Impl | TASK-02 |
| TODO | TASK-04 | Passata visiva | Verifica su dev server di tutti i modali, desktop + mobile (375px); confronto ProfileModal ↔ mockup. | Test | TASK-01, TASK-03 |
| TODO | TASK-05 | Guard-rail qualità | `npm run lint` (0 problemi) e build pulita; smoke sui flussi dei modali toccati. | Test | TASK-04 |
| TODO | TASK-06 | CHANGELOG e versione | Voce CHANGELOG e bump di `package.json`. | Impl | TASK-05 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-005/`

_Piano generato via Archetipo Planning — 2026-07-05_
