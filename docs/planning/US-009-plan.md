# US-009: Validazione campi obbligatori atleta — Piano di Implementazione

**Generato da:** Archetipo Planning Team  
**Data:** 2026-07-07  

---

## User Story

**Epic:** EP-003 — Anagrafica Atleti & Validazione  
**Priorità:** HIGH | **Story Points:** 3  

**Story**  
Come Dirigente,  
voglio che la creazione o modifica di un atleta sia bloccata finché tutti i campi obbligatori (anagrafica essenziale, codice fiscale, contatti genitori) non sono compilati,  
così che il database non contenga schede atleta incomplete o inutilizzabili.  

**Criteri di Accettazione**  
- [ ] Il form nei modali atleti evidenzia i campi obbligatori mancanti o non validi prima dell'invio, con messaggi in italiano
- [ ] La validazione è applicata anche lato server: una richiesta diretta con dati incompleti viene rifiutata
- [ ] Il codice fiscale è validato nel formato
- [ ] Un atleta esistente con dati incompleti può essere aperto in modifica, ma non salvato finché i campi obbligatori non sono completati

---

## Soluzione Tecnica

Per garantire l'integrità strutturale del database senza rompere la consultazione storica degli atleti parziali, implementiamo un sistema di validazione sia lato client che lato server:

- **Migrazione SQL — Trigger di Validazione `BEFORE INSERT OR UPDATE`**:
  Creeremo una nuova migrazione per installare una funzione trigger `validate_player_fields()` e il relativo trigger `trg_validate_player_fields` sulla tabella `players`.
  Il trigger effettuerà i seguenti controlli:
  - **Anagrafica essenziale**: `first_name`, `last_name`, `birth_date`, `birth_place`, `citizenship`, `team_sector` non devono essere nulli o stringhe vuote.
  - **Residenza obbligatoria**: `address_street`, `address_city`, `address_zip` non devono essere nulli o vuoti.
  - **Contatti atleta**: `email` non nulla/vuota e almeno uno tra `phone_player` o `phone_home` non nullo/vuoto.
  - **Consenso Privacy**: `privacy_accepted` deve essere `true`.
  - **Codice Fiscale**: `tax_code` non nullo/vuoto e corrispondente alla regex italiana standard:
    `^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-MZ][0-9LMNPQRSTUV]{3}[A-Z]$` (case-insensitive).
  - **Contatti Genitori (Minorenni)**: Se l'atleta è minorenne alla data odierna (`birth_date > CURRENT_DATE - INTERVAL '18 years'`), deve esserci almeno un genitore valido con nome e telefono compilati (es. `parent1_name` e `parent1_phone` oppure `parent2_name` e `parent2_phone`).
  - Se una regola viene violata, solleverà un'eccezione con `RAISE EXCEPTION` in italiano. Questo garantisce che i record già presenti nel database rimangano leggibili ma non possano essere aggiornati (`UPDATE`) se non completando i dati mancanti.

- **Refactoring `AddAthleteModal.tsx`**:
  - **Stato di errore granulare**: Aggiungeremo uno stato `errors` (record di stringhe indicizzato sui campi del form) e una funzione `validateField(name, value)` per calcolare l'errore.
  - **Validazione al blur/change**: I campi verranno validati in tempo reale (onBlur e onChange) fornendo feedback immediato anziché attendere il submit finale.
  - **Validazione Codice Fiscale**: Useremo la stessa regex del server nel frontend per validare il codice fiscale.
  - **Evidenziazione visiva degli input**: Quando un campo è invalido o mancante (e l'utente ci ha interagito), mostreremo il bordo rosso (`border-destructive`) e una label descrittiva di errore in rosso sotto l'input.
  - **Indicatori di errore sui Tab delle sezioni**: Nei pulsanti dei tab del modale, calcoleremo se la rispettiva sezione contiene errori attivi. Se sì, mostreremo un pallino rosso di errore accanto all'icona del tab. Questo guiderà l'utente tra i tab per identificare dove risiedono i campi non validi.
  - **Gestione atleti esistenti**: L'apertura in modifica caricherà l'atleta. Poiché i controlli scattano all'interazione o al submit, l'utente potrà visualizzare la scheda, ma il tasto "Salva modifiche" sarà disabilitato finché tutti i campi non saranno corretti.

---

## Strategia di Test

- **Test del Trigger SQL (Integrazione)**:
  - Scrittura di uno script di test in `scratch/test_validation_trigger.sql` (eseguibile tramite Supabase o client PostgreSQL locale) per verificare:
    - Inserimento corretto di atleta maggiorenne completo.
    - Inserimento corretto di atleta minorenne con almeno un genitore.
    - Fallimento inserimento minorenne senza genitore (verifica messaggio di errore).
    - Fallimento inserimento con codice fiscale invalido (verifica regex).
    - Fallimento aggiornamento su record esistente impostando a NULL un campo obbligatorio.
- **Test del Form React (Unit/Component)**:
  - Verifica che la digitazione di un codice fiscale errato generi l'errore visivo.
  - Verifica che la compilazione corretta rimuova l'errore.
  - Verifica che il pallino rosso compaia sui tab contenenti campi non validi.
  - Verifica che il tasto di salvataggio si abiliti solo quando `errors` è privo di errori e tutti i requisiti obbligatori sono soddisfatti.
- **Test E2E manuale**:
  - Creare un nuovo atleta compilando tutto tranne il codice fiscale. Verificare che l'input codice fiscale si evidenzi in rosso e indichi il formato non valido.
  - Aprire in modifica un atleta esistente con dati incompleti. Verificare che la visualizzazione funzioni e che i tab con i dati mancanti abbiano il pallino rosso, e che il salvataggio sia bloccato finché non vengono completati.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Creazione migrazione trigger SQL | Scrivere la migrazione PostgreSQL `validate_player_fields` in `supabase/migrations` con trigger `BEFORE INSERT OR UPDATE` e tutti i controlli strutturali. | Impl | - |
| TODO | TASK-02 | Script di test integrazione SQL | Creare ed eseguire uno script `scratch/test_validation_trigger.sql` per convalidare il trigger contro le regole aziendali. | Test | TASK-01 |
| TODO | TASK-03 | Logica di validazione frontend | Introdurre lo stato `errors` e le funzioni di validazione (inclusa regex CF) in `AddAthleteModal.tsx`. | Impl | - |
| TODO | TASK-04 | Feedback visivo sui campi del form | Aggiornare i campi del form per renderizzare bordi rossi e testi d'errore localizzati in base allo stato `errors`. | Impl | TASK-03 |
| TODO | TASK-05 | Indicatori di errore sui tab del modale | Calcolare se ciascuna sezione ha errori attivi e mostrare un pallino rosso grafico sul rispettivo pulsante del tab. | Impl | TASK-03 |
| TODO | TASK-06 | Collaudo e2e e regressione | Verificare manualmente il flusso di inserimento, modifica di record parziali e blocco del salvataggio. | Test | TASK-04, TASK-05 |

---

_Piano generato via Archetipo Planning — 2026-07-07_
