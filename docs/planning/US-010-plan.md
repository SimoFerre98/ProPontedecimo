# US-010: Gestione numero matricola — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-08

---

## User Story

**Epic:** EP-003 — Anagrafica Atleti & Validazione
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come Dirigente,
voglio registrare il numero di matricola di ciascun atleta nei form di inserimento e modifica,
così che il tesseramento federale sia tracciato nel gestionale.

**Criteri di Accettazione**
- [x] La matricola è tracciata a livello database (colonna già esistente, vedi nota sotto)
- [x] Il campo matricola è presente nei form di inserimento e modifica atleta e viene salvato correttamente (già implementato)
- [ ] La matricola è visibile nella scheda/lista atleti
- [x] Il campo è facoltativo al salvataggio (già implementato)

> ⚠️ **Nota di scoping (decisa con l'utente in sessione di planning):** la story, come scritta nel backlog, chiedeva di aggiungere una nuova colonna `registration_number`. L'analisi del codice (`grep` su `players` e sui form atleta, come richiesto dal CLAUDE.md prima di ogni migrazione su tabelle condivise) ha rilevato che la colonna `figc_registration` esiste già nella baseline schema, è già un campo del form ("Matricola FIGC" in `AddAthleteModal.tsx`), è già salvata da `createPlayer`/`updatePlayer`, è già facoltativa (non è tra i campi validati dal trigger `validate_player_fields` di US-009) ed è già copiata dalla RPC `create_season_from_wizard`. Creare `registration_number` come colonna separata avrebbe duplicato lo stesso dato con due fonti di verità. **Decisione: si riusa `figc_registration`.** L'unico requisito non ancora soddisfatto è la visibilità in lista/scheda atleti — questo piano copre solo quel gap.

---

## Soluzione Tecnica

Poiché il dato esiste già end-to-end (schema, form, salvataggio), l'unico intervento necessario è di presentazione: rendere visibile `player.figc_registration` nella pagina `Athletes.tsx`, sia in vista tabella sia in vista card, senza toccare schema, servizio o form.

- Vista tabella: nuova colonna "Matricola" tra "Tesserato" e "Azioni", con fallback `-` quando il campo è `null`, seguendo lo stesso pattern già usato per `team_sector` e `medical_expiry` in quella tabella
- Vista card: nuova riga informativa (o tile aggiuntiva nella info-grid esistente) che mostra la matricola quando presente, con la stessa icona (`FileText`) già usata per il campo nel form `AddAthleteModal.tsx`, mantenendo coerenza visiva
- Nessuna migrazione, nessuna modifica a `athleteService.ts` (il tipo `Player` include già `figc_registration: string | null`) né a `AddAthleteModal.tsx` (il campo è già presente e funzionante nei form di inserimento/modifica)

---

## Strategia di Test

Trattandosi di un cambio puramente di presentazione su un dato già validato e persistito correttamente, la strategia si concentra su verifica manuale/e2e della UI piuttosto che su nuovi test di integrazione contro il database.

- Verifica visiva manuale (via preview) che la colonna "Matricola" compaia in vista tabella con dato reale e con fallback `-` per atleti senza matricola
- Verifica visiva manuale che la vista card mostri correttamente la matricola quando presente e non rompa il layout quando assente
- Regressione: confermare che nessuna suite in `scripts/test-*.mjs` sia impattata (il cambio non tocca schema, RPC o RLS) — non serve `npx supabase db reset` per questa story

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Aggiungi colonna "Matricola" alla vista tabella | In `Athletes.tsx`, aggiungere `<th>` "Matricola" e la relativa `<td>` che mostra `player.figc_registration || '-'`, posizionata prima della colonna "Azioni" | Impl | - |
| TODO | TASK-02 | Aggiungi visualizzazione matricola alla vista card | In `Athletes.tsx`, aggiungere una tile/riga nella card atleta che mostra `player.figc_registration` quando presente, con icona `FileText` coerente con il form | Impl | - |
| TODO | TASK-03 | Verifica manuale UI (tabella e card) | Avviare il dev server, verificare con dati reali/di test che la matricola compaia correttamente in entrambe le viste, con e senza valore, e che non ci siano regressioni visive | Test | TASK-01, TASK-02 |

---

_Piano generato via Archetipo Planning — 2026-07-08_
