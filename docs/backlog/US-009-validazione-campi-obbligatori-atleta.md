# US-009: Validazione campi obbligatori atleta

**Epic:** EP-003 — Anagrafica Atleti & Validazione | **Priority:** HIGH | **Story Points:** 3 | **Scope:** MVP

**Story**
Come Dirigente,
voglio che la creazione o modifica di un atleta sia bloccata finché tutti i campi obbligatori (anagrafica essenziale, codice fiscale, contatti genitori) non sono compilati,
così che il database non contenga schede atleta incomplete o inutilizzabili.

**Demonstrates**
After implementing this story, the user can: tentare di salvare un atleta senza codice fiscale e vedere il salvataggio bloccato con messaggi d'errore chiari sui campi mancanti.

**Acceptance Criteria**
- [ ] Il form nei modali atleti evidenzia i campi obbligatori mancanti o non validi prima dell'invio, con messaggi in italiano
- [ ] La validazione è applicata anche lato server: una richiesta diretta con dati incompleti viene rifiutata
- [ ] Il codice fiscale è validato nel formato
- [ ] Un atleta esistente con dati incompleti può essere aperto in modifica, ma non salvato finché i campi obbligatori non sono completati

**Status:** TODO
**Plan:** —

