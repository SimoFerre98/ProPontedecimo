# US-014: Feed iCal personalizzato per la sincronizzazione esterna

**Epic:** EP-004 — Calendario Eventi & Sincronizzazione | **Priority:** MEDIUM | **Story Points:** 5 | **Scope:** MVP

**Story**
Come Genitore,
voglio iscrivermi a un link iCal (.ics) personale che espone gli eventi societari di mio interesse,
così che allenamenti e partite compaiano automaticamente e in tempo reale su Google Calendar, Apple Calendar o Outlook.

**Demonstrates**
After implementing this story, the user can: copiare il proprio link iCal, aggiungerlo a Google Calendar e vedere gli eventi societari sincronizzati.

**Acceptance Criteria**
- [ ] Un endpoint (Supabase Edge Function) espone un feed `.ics` dinamico e valido per i principali client (Google, Apple, Outlook)
- [ ] Il link è personalizzato per utente tramite token non indovinabile e mostra solo gli eventi di sua competenza
- [ ] Gli eventi di tipo Partita includono l'orario di ritrovo nel dettaglio dell'evento esportato (dipende da US-013)
- [ ] Le modifiche agli eventi si riflettono nel feed al successivo refresh del client
- [ ] L'utente può rigenerare il proprio link, invalidando il precedente

**Status:** TODO
**Plan:** —

