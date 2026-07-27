# US-059: Fix stile campi Titolo/Messaggio nel compositore comunicazioni

**Epic:** EP-013 — Sistema di Notifiche Color-Coded | **Priority:** MEDIUM | **Story Points:** 1 | **Scope:** Vision

**Story**
Come membro dello staff che scrive una comunicazione/notifica,
voglio che i campi Titolo e Messaggio siano leggibili e coerenti con lo stile dell'app,
così che comporre un annuncio non sembri un form abbandonato senza stile.

**Demonstrates**
After implementing this story, the user can: aprire il compositore comunicazioni in Notifiche e vedere i campi Titolo e Messaggio con lo stesso stile "glass" (bordo, padding, radius, focus) degli altri form dell'app.

**Acceptance Criteria**
- [ ] Le classi `.compose-card`, `.compose-section`, `.compose-label`, `.compose-input`, `.compose-textarea` usate in [Notifiche.tsx](../../src/pages/Notifiche.tsx) sono definite in `src/index.css` (oggi assenti/orfane)
- [ ] Lo stile è coerente con gli altri modali/form dell'app (Premium Glass, vedi US-005)
- [ ] Verifica manuale visiva del compositore comunicazioni, incluso lo stato di focus sui campi

**Context**
Analisi del codice (2026-07-27): [Notifiche.tsx](../../src/pages/Notifiche.tsx) referenzia le classi `compose-card`/`compose-section`/`compose-label`/`compose-input`/`compose-textarea`, ma nessuna di queste è definita in `src/index.css` (unico foglio di stile custom oltre Tailwind) — confermato con ricerca su tutto `src/`. I campi Titolo (input) e Messaggio (textarea) vengono quindi renderizzati con lo stile grezzo di default del browser, il che spiega la percezione "brutti/poco chiari" segnalata dall'utente. Non è una questione di dimensione font scelta male: è una classe CSS mai implementata.

**Status:** TODO
