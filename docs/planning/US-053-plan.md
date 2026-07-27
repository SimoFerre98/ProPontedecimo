# US-053: Guida — Presenze e Calendario Eventi — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come allenatore, voglio un capitolo della guida su come registrare le presenze e leggere il calendario eventi, con screenshot, così che possa usare questi strumenti senza formazione dedicata.

**Criteri di Accettazione**
- [ ] È documentato con screenshot come aprire il registro presenze e segnare un giocatore presente, assente o giustificato (vedi US-017)
- [ ] È documentato come leggere il calendario eventi, riconoscere le tipologie di evento e i due orari di ritrovo/inizio (vedi US-013)
- [ ] È documentato in linguaggio semplice come sincronizzare il calendario con un'app esterna tramite il feed iCal (vedi US-014)

---

## Soluzione Tecnica

Nessuna modifica al database. Il registro presenze (`Attendance.tsx`) e le tipologie evento sono strumenti Staff (coach/president/director); il feed iCal invece è generato in `ProfileModal.tsx`, componente condiviso e raggiungibile da entrambi i layout (Staff e Portale) — quindi il capitolo ha `audience: 'both'`, con la terza sezione (feed iCal) rilevante per tutti i ruoli.

- Nuovo componente `src/components/guide/chapters/PresenzeCalendarioChapter.tsx` con 3 sezioni verificate contro il codice reale: (1) registro presenze (`Attendance.tsx`) con i tre pulsanti per riga atleta (Presente/Assente/Giustificato) e il riepilogo percentuale; (2) tipologie di evento da `eventTypes.ts` (Allenamento, Partita in Casa, Trasferta, Riunione, Evento Generico) e i due orari "Orario Ritrovo (Richiesto per le partite)" + orario di inizio da `EventModal.tsx`; (3) il link del feed iCal copiabile dalla sezione Profilo (`ProfileModal.tsx`) con spiegazione in linguaggio semplice ("copia questo link nel tuo calendario Google o Apple").
- Aggiornare l'entry `presenze-calendario` in `guideChapters.tsx`: `status: 'available'`, `audience: 'both'`, `Component: PresenzeCalendarioChapter`.

---

## Strategia di Test

Nessuna suite `scripts/test-*.mjs` interessata. `npx tsc --noEmit` per questa story; `npm run test:integration` e verifica manuale eseguiti una sola volta al termine della batch EP-015.

---

## Task di Implementazione

| Stato | # | Task | Descrizione |
|---|---|---|---|
| DONE | TASK-01 | Componente `PresenzeCalendarioChapter.tsx` | Creare il capitolo con le 3 sezioni (registro presenze, tipologie evento/doppio orario, feed iCal) |
| DONE | TASK-02 | Registrazione capitolo | `status: 'available'`, `audience: 'both'`, `Component: PresenzeCalendarioChapter` |

---

_Piano generato via Archetipo Planning — 2026-07-27_
