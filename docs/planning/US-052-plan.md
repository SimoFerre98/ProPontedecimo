# US-052: Guida — Pagamenti e Quote — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come utente con accesso ai pagamenti, voglio un capitolo della guida che spieghi, con screenshot, come registrare un pagamento, creare un piano rateale e capire lo stato degli insoluti, così che possa gestire le quote senza commettere errori.

**Criteri di Accettazione**
- [ ] È documentato con screenshot come registrare/consultare un pagamento per un atleta
- [ ] È documentato passo-passo, con screenshot, come creare o modificare un piano di pagamento multi-rata (vedi US-015)
- [ ] È spiegato in linguaggio semplice cosa significa lo stato "insoluto" e come viene trascinato da una stagione all'altra (vedi US-016)
- [ ] È documentato, con rimando al capitolo Reportistica per il dettaglio, come esportare i pagamenti in Excel

---

## Soluzione Tecnica

Nessuna modifica al database. Capitolo visibile solo a Staff (`audience: 'staff'`): la pagina Pagamenti (`src/pages/Payments.tsx`) non ha equivalente nel Portale (il genitore vede il proprio bilancio tramite `ChildBillingCard`, già coperto da US-056).

- Nuovo componente `src/components/guide/chapters/PagamentiQuoteChapter.tsx` con 4 sezioni verificate contro il codice reale: (1) elenco pagamenti con stati (Saldato/In attesa/Scaduta, `StatusBadge`) tratto da `PlayerPaymentSummaryModal.tsx`; (2) creazione piano rate multi-installment da `NewPaymentModal.tsx` (stepper numero rate, importi e scadenze editabili, pulsante "Crea Piano Rate"); (3) spiegazione in linguaggio semplice della rata `plan: 'carried_over'` mostrata come "Debito Pregresso" (badge ambra) e di come viene generata automaticamente dal wizard di nuova stagione (vedi US-016/US-051); (4) rimando al capitolo "Reportistica ed Esportazioni" per il pulsante "Esporta Excel" già presente in `Payments.tsx`.
- Aggiornare l'entry `pagamenti-quote` in `guideChapters.tsx`: `status: 'available'`, `audience: 'staff'`, `Component: PagamentiQuoteChapter`.

---

## Strategia di Test

Nessuna suite `scripts/test-*.mjs` interessata. `npx tsc --noEmit` per questa story; `npm run test:integration` e verifica manuale eseguiti una sola volta al termine della batch EP-015 (US-051→US-056).

---

## Task di Implementazione

| Stato | # | Task | Descrizione |
|---|---|---|---|
| DONE | TASK-01 | Componente `PagamentiQuoteChapter.tsx` | Creare il capitolo con le 4 sezioni (elenco rate, creazione piano multi-rata, debito pregresso, rimando export) |
| DONE | TASK-02 | Registrazione capitolo | `status: 'available'`, `audience: 'staff'`, `Component: PagamentiQuoteChapter` |

---

_Piano generato via Archetipo Planning — 2026-07-27_
