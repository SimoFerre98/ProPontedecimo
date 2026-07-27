# US-051: Guida — Stagioni Sportive — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come presidente o direttore, voglio un capitolo della guida su selettore stagione e wizard di nuova stagione, con screenshot, così che possa cambiare la stagione attiva o crearne una nuova senza incertezze.

**Criteri di Accettazione**
- [ ] È spiegato con screenshot dove si trova il selettore stagione in header e come cambiare la stagione attiva (vedi US-007)
- [ ] È documentato passo-passo, con uno screenshot per ogni schermata, il wizard di creazione nuova stagione, incluso lo scatto di leva (vedi US-008)
- [ ] È spiegato in linguaggio semplice cosa succede agli atleti e ai pagamenti quando si crea una nuova stagione (copia storica degli atleti, trascinamento degli insoluti)

---

## Soluzione Tecnica

Segue lo stesso pattern di US-050: nessuna modifica al database, capitolo illustrato con callout numerati (nessuno screenshot reale persistibile su disco, come già approvato in US-049/US-050). Il capitolo è rilevante solo per Staff (il selettore stagione e il wizard sono controlli visibili solo a `president`/`director`/`coach` in `DashboardLayout.tsx`; il Portale non ha equivalente), quindi `audience: 'staff'`.

- Nuovo componente `src/components/guide/chapters/StagioniSportiveChapter.tsx` con 3 sezioni verificate contro il codice reale: (1) pillola "Stagione" in header con dropdown elenco stagioni e badge "Attiva" (`DashboardLayout.tsx`); (2) voce "Nuova stagione" nel dropdown, visibile solo a president/director; (3) i 4 step del wizard (`NewSeasonWizardModal.tsx`: dati stagione, selezione atleti attivi, destinazione leve/scatto leva con leve personalizzate, schermata di successo con conteggio importati); (4) spiegazione in linguaggio semplice di cosa viene copiato (atleti attivi, matricola, scadenza visita medica) e cosa viene trascinato (insoluti come rata `Debito Pregresso`, vedi US-016).
- Aggiornare l'entry `stagioni-sportive` in `guideChapters.tsx`: `status: 'available'`, `audience: 'staff'`, `Component: StagioniSportiveChapter`.

---

## Strategia di Test

Nessuna suite `scripts/test-*.mjs` interessata (nessuna modifica DB/RPC). Type-check (`npx tsc --noEmit`) eseguito per ogni story della batch; `npm run test:integration` eseguito una sola volta al termine dell'intera batch EP-015 (US-051→US-056), dato che nessuna di queste story tocca superfici condivise del database. Verifica manuale Staff/Portale/responsive eseguita anch'essa una sola volta al termine della batch, sull'intero indice aggiornato.

---

## Task di Implementazione

| Stato | # | Task | Descrizione |
|---|---|---|---|
| DONE | TASK-01 | Componente `StagioniSportiveChapter.tsx` | Creare il capitolo con le 4 sezioni (selettore stagione, voce Nuova stagione, step del wizard, spiegazione copia/trascinamento) |
| DONE | TASK-02 | Registrazione capitolo | `status: 'available'`, `audience: 'staff'`, `Component: StagioniSportiveChapter` |

---

_Piano generato via Archetipo Planning — 2026-07-27_
