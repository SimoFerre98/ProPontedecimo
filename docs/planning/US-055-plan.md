# US-055: Guida — Reportistica ed Esportazioni — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** LOW | **Story Points:** 1

**Story**
Come presidente o direttore, voglio un capitolo della guida su come esportare i dati in Excel e leggere i grafici finanziari, con screenshot, così che possa produrre report senza assistenza tecnica.

**Criteri di Accettazione**
- [ ] È documentato con screenshot come avviare un'esportazione Excel di atleti e pagamenti (vedi US-021)
- [ ] È documentato con screenshot come leggere i grafici di andamento finanziario e i filtri disponibili (vedi US-022)

---

## Soluzione Tecnica

Nessuna modifica al database. L'esportazione Excel e i grafici finanziari sono strumenti Staff (`Payments.tsx`, `Athletes/index.tsx`, `FinancialTrendChart.tsx` in Dashboard), quindi `audience: 'staff'`.

- Nuovo componente `src/components/guide/chapters/ReportisticaEsportazioniChapter.tsx` con 2 sezioni verificate contro il codice reale: (1) pulsante "Esporta Excel" presente sia in `Payments.tsx` che nella pagina Atleti; (2) il grafico "Incassato vs Previsto" di `FinancialTrendChart.tsx` con le tre serie (Previsto, Quota Incassata, Insoluti Recuperati) e la spiegazione in linguaggio semplice del divario tra le due barre.
- Aggiornare l'entry `reportistica-esportazioni` in `guideChapters.tsx`: `status: 'available'`, `audience: 'staff'`, `Component: ReportisticaEsportazioniChapter`.

---

## Strategia di Test

Nessuna suite `scripts/test-*.mjs` interessata. `npx tsc --noEmit` per questa story; `npm run test:integration` e verifica manuale eseguiti una sola volta al termine della batch EP-015.

---

## Task di Implementazione

| Stato | # | Task | Descrizione |
|---|---|---|---|
| DONE | TASK-01 | Componente `ReportisticaEsportazioniChapter.tsx` | Creare il capitolo con le 2 sezioni (esportazione Excel, grafico andamento finanziario) |
| DONE | TASK-02 | Registrazione capitolo | `status: 'available'`, `audience: 'staff'`, `Component: ReportisticaEsportazioniChapter` |

---

_Piano generato via Archetipo Planning — 2026-07-27_
