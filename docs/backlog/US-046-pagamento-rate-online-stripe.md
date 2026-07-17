# US-046: Pagamento rate online con Stripe

**Epic:** EP-010 — Portale Genitore & Pagamenti Online | **Priority:** LOW | **Story Points:** 5 | **Scope:** Vision

**Story**
Come Genitore,
voglio pagare le rate dei miei figli direttamente dal portale con carta di credito o Apple Pay tramite Stripe,
così che il pagamento sia immediato e la contabilità della società si aggiorni da sola.

**Demonstrates**
After implementing this story, the user can: pagare una rata dal portale e vederla risultare "pagata" nel bilancio del figlio senza intervento dell'amministrazione.

**Acceptance Criteria**
- [ ] Il genitore può avviare il pagamento di una rata dovuta tramite checkout Stripe (dipende da US-028)
- [ ] Il buon esito del pagamento aggiorna in tempo reale lo stato della rata sul database (webhook)
- [ ] Un pagamento fallito o annullato non modifica lo stato della rata
- [ ] Ogni transazione è riconciliabile dall'amministrazione (riferimento Stripe visibile lato admin)

**Status:** TODO
**Plan:** —

> **⏸ Nota di sequenziamento (2026-07-17):** su richiesta esplicita, questa story è stata rinumerata da US-029 a **US-046** e spostata in fondo all'ordine di lavorazione, **dopo EP-009 (Deploy VPS, Migrazione & Backup)** — il pagamento reale via Stripe richiede l'infrastruttura di produzione, quindi si lavora solo a VPS operativa. La rinumerazione (non solo lo spostamento nell'indice) garantisce che anche l'ordinamento alfabetico dei file in `docs/backlog/` rifletta questa sequenza, evitando di lavorarla per errore prima del tempo.

