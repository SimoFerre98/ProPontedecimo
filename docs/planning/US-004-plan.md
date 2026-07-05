# US-004: Risoluzione warning linter e TypeScript — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-05

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** MEDIUM | **Story Points:** 1

**Story**
Come sviluppatore del progetto,
voglio una codebase senza warning di compilazione né del linter,
così che ogni nuovo warning sia immediatamente visibile e la qualità resti conforme alle Developer Guidelines.

**Criteri di Accettazione**
- [ ] La build TypeScript in strict mode non produce alcun warning
- [ ] Il linter non segnala alcun warning, incluse le chiavi di array basate su index
- [ ] Nessuna soppressione generica dei warning (es. `eslint-disable` di massa) introdotta come scorciatoia

---

## Soluzione Tecnica

Censimento eseguito su `dev` il 2026-07-05: la **build TypeScript è già pulita** (`tsc -b && vite build` senza errori né warning — AC1 di fatto già soddisfatto), mentre `npm run lint` segnala **24 problemi (19 errori, 5 warning)** in 10 file. Nessuna chiave di array basata su index rilevata (il caso citato dall'AC2 risulta già bonificato). Si risolve tutto alla radice, senza soppressioni.

- **Fix meccanici (4):** `calendarService.ts` — parametro `_month` e binding `e` inutilizzati (rimozione); `Inventory.tsx:34` e `Payments.tsx:37` — espressione logica `items`/`payments` da avvolgere in `useMemo` dedicato come suggerito da `react-hooks/exhaustive-deps`.
- **Sostituzione dei 12 `any` con tipi reali:** `TaskListView.tsx:21`, `Athletes.tsx:83` (`filters as any`), `Payments.tsx:42-44` (5 occorrenze nei reduce delle statistiche), `RegisterPage.tsx:63` (catch dell'errore), `athleteService.ts:107`, `calendarService.ts:14`, `notificationService.ts:143`. Dove il tipo esiste già in `src/types/database.ts` lo si riusa; per i filtri si introducono tipi minimi locali. ⚠️ **Sovrapposizione con US-038 annotata:** US-038 (tipizzazione filtri) verrà ridimensionata in fase di planning alla sola parte strutturale residua (tipi filtro condivisi in `src/types` + firme dei services), se questa story non l'avrà già assorbita.
- **Violazioni `react-refresh/only-export-components` (2):** da manuale — estrarre `buttonVariants` da `components/ui/button.tsx` in `components/ui/button-variants.ts` e l'hook `useAuth` (+ eventuale context) da `contexts/AuthContext.tsx` in `src/hooks/useAuth.ts`, aggiornando tutti gli import nella codebase. Nessuna eccezione di configurazione ESLint (AC3).
- **Guardia anti-regressione:** l'AC "zero warning" resta verificabile in un comando (`npm run lint` + `npm run build`); nessuna nuova regola introdotta, solo conformità a quelle esistenti.

---

## Strategia di Test

Story di bonifica: la verifica primaria è l'output degli strumenti stessi, più uno smoke funzionale sulle pagine toccate per escludere regressioni comportamentali.

- **Lint pulito** (tooling): `npm run lint` → 0 errori, 0 warning
- **Build pulita** (tooling): `npm run build` → successo senza warning TS
- **Smoke funzionale** (manuale/preview): login, pagine Payments, Inventory, Athletes e lista task (i file toccati) si caricano e funzionano come prima; particolare attenzione alle statistiche di Payments (i 5 `any` nei reduce) e al context di autenticazione dopo l'estrazione di `useAuth`
- **Grep di controllo** (tooling): nessun nuovo `eslint-disable`/`@ts-ignore` introdotto dal diff

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Fix meccanici | Rimuovere le variabili inutilizzate in `calendarService.ts` e sistemare i due `useMemo` segnalati da exhaustive-deps in `Inventory.tsx` e `Payments.tsx`. | Impl | - |
| DONE | TASK-02 | Sostituzione degli `any` | Tipizzare le 12 occorrenze segnalate riusando i tipi di `src/types/database.ts` dove esistono; tipi minimi locali per filtri e catch. | Impl | - |
| DONE | TASK-03 | Estrazione export non-componente | `buttonVariants` → `components/ui/button-variants.ts`; `useAuth` → `src/hooks/useAuth.ts`; aggiornare tutti gli import. | Impl | - |
| DONE | TASK-04 | Verifica tooling | `npm run lint` (atteso 0 problemi) e `npm run build` (attesa build pulita); grep anti-soppressioni sul diff. | Test | TASK-01, TASK-02, TASK-03 |
| DONE | TASK-05 | Smoke funzionale | Verifica delle pagine toccate (login/auth, Payments, Inventory, Athletes, task list): rendering e comportamento invariati. | Test | TASK-04 |
| DONE | TASK-06 | CHANGELOG e versione | Voce CHANGELOG e bump patch di `package.json`. | Impl | TASK-04 |

---

_Piano generato via Archetipo Planning — 2026-07-05_
