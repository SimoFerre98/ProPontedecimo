# US-012: Stabilità calendario e correzione fusi orari — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-08

---

## User Story

**Epic:** EP-004 — Calendario Eventi & Sincronizzazione
**Priorità:** HIGH | **Story Points:** 3

**Story**
Come membro dello staff,
voglio che gli eventi del calendario appaiano sempre nel giorno e nell'orario corretti,
così che non ci siano equivoci su allenamenti e partite causati da offset di fuso orario o rendering instabile.

**Criteri di Accettazione**
- [ ] Gli eventi sono visualizzati nel giorno e orario corretti senza offset di timezone
- [ ] Gli eventi multi-giorno sono visualizzati correttamente su tutti i giorni coperti
- [ ] Il rendering del calendario è stabile (nessun salto o scomparsa di eventi) al cambio di mese o vista

> ℹ️ **Nota diagnostica:** prima di proporre una soluzione, il bug è stato riprodotto empiricamente contro Supabase locale (insert diretto su `staff_tasks.start_date`). Non è un problema di rendering del calendario in sé, ma di **serializzazione all'origine** in `TaskModal.tsx`, che si propaga alla lettura in `calendarService.ts`. Il loop multi-giorno esistente è stato verificato e **non** presenta il bug ipotizzato inizialmente — vedi dettagli sotto.

---

## Soluzione Tecnica

La causa radice è che `TaskModal.tsx` costruisce stringhe datetime **senza offset di timezone** (es. `"2026-03-15T18:00:00"`) e le invia così com'è alla colonna `start_date`/`end_date`/`due_date` (`timestamp with time zone`). Supabase/Postgres ha timezone di sessione `UTC` di default (nessun `SET timezone` nelle migrazioni), quindi interpreta quella stringa come UTC 18:00 anziché come le 18:00 locali del browser — un evento creato "alle 18:00" viene salvato e ri-letto come 19:00/20:00 locali (CET/CEST). La correzione tocca sia il percorso di scrittura sia quello di lettura, in entrambi i file coinvolti, usando un'unica coppia di helper condivisi per evitare che la stessa svista timezone venga corretta in un punto e dimenticata nell'altro.

- Nuovo modulo `src/lib/dateTime.ts` con due helper puri: `combineLocalDateTime(date, time)` costruisce un vero `Date` locale (`new Date(y, m-1, d, hh, mm)`) e ne ritorna `.toISOString()` — che codifica correttamente l'offset UTC del browser — e `splitLocalDateTime(isoString)` fa il percorso inverso, leggendo i getter locali del `Date` risultante invece di tagliare a mano i caratteri della stringa ISO grezza
- `TaskModal.tsx` (righe 42-53, `parseDateTime`/`combineDateTime`): sostituiti con i nuovi helper condivisi, così sia la creazione/modifica di un task (scrittura) sia il precompilamento del form in modifica (lettura) usano la stessa logica timezone-corretta
- `calendarService.ts` (righe 39-41, `timeStr`): oggi deriva l'etichetta oraria tagliando a mano i caratteri di `task.start_date` grezzo, che con la sola fix di TaskModal mostrerebbe comunque l'ora in UTC anziché locale; sostituito con `splitLocalDateTime` sullo stesso valore già usato per calcolare `start`, così l'etichetta corrisponde sempre al giorno/ora dove l'evento è effettivamente posizionato in griglia
- `calendarService.ts` (riga 92, mapping `medical_expiry`): fix difensivo. `medical_expiry` è una colonna `date` bare (`"2026-03-15"`, senza ora); oggi viene passata as-is e in `CalendarModal.tsx:143` finisce in `new Date(e.date)`, che interpreta una data bare come mezzanotte UTC — per fusi a offset negativo il giorno visualizzato scivolerebbe indietro di uno (per l'Italia, offset positivo, oggi non si manifesta, ma è la stessa classe di bug già risolta in `AddAthleteModal.tsx:79-94` con parsing manuale). Si applica lo stesso pattern: `medical_expiry` viene parsata a mano (`split('-').map(Number)` → `Date` locale a mezzanotte) prima di essere assegnata a `CalendarEvent.date`
- **Nessuna modifica** al loop multi-giorno (`calendarService.ts:48-54`, `eachDayOfInterval` + `day.toISOString()`): verificato che il round-trip `Date` → ISO string → `new Date(...)` preserva l'istante esatto, e `isSameDay(new Date(e.date), day)` a valle estrae correttamente il giorno di calendario locale. Non è il bug che sembrava a un primo sguardo — lasciato invariato e documentato qui per evitare di rifare la stessa verifica in futuro
- **Ipotesi su AC3** (stabilità del rendering): non è stata trovata alcuna instabilità di rendering React indipendente (chiavi stabili, nessuna paginazione che nasconda eventi). L'ipotesi di lavoro è che "eventi che saltano/spariscono" fosse un effetto collaterale del bug di offset: un task tardo-serale (es. 23:30 locali), spostato di 1-2h in avanti dall'interpretazione UTC errata, poteva apparire nel giorno o mese sbagliato navigando il calendario. Verificata con un test mirato (TASK-07) invece di introdurre codice per un problema non confermato separatamente

---

## Strategia di Test

Il bug è di parsing/serializzazione JS lato frontend, non un vincolo di database: la strategia privilegia test mirati sugli helper e sul percorso end-to-end task→calendario, più verifica visiva manuale per l'AC3.

- Test dedicato (`scripts/test-*.mjs` o script Node standalone) sugli helper `combineLocalDateTime`/`splitLocalDateTime`: round-trip identità su orari limite (mezzanotte, 18:00, 23:30 a cavallo di mezzanotte) per garantire che comporre e poi ri-scomporre restituisca sempre lo stesso giorno/ora
- Test di integrazione: creare un task via `staffService.createTask` con un orario locale noto, rileggerlo tramite `calendarService.getEventsForMonth()` e verificare che il giorno e l'ora derivati (via i helper corretti) coincidano con quelli inseriti
- Verifica visiva manuale (via preview): creare un evento alle 18:00 e confermare che compaia alle 18:00 nel giorno giusto; creare un evento alle 23:30 e verificare che resti nel giorno corretto navigando tra mesi adiacenti (copre l'ipotesi AC3); confermare che il badge di scadenza visita medica resti nel giorno corretto

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Crea helper condivisi `combineLocalDateTime`/`splitLocalDateTime` | Nuovo `src/lib/dateTime.ts` con le due funzioni pure, timezone-corrette, da riusare in TaskModal e calendarService | Impl | - |
| DONE | TASK-02 | Test round-trip degli helper su orari limite | Script Node che verifica identità di combine→split su mezzanotte, 18:00, 23:30 e date a cavallo di cambio mese | Test | TASK-01 |
| DONE | TASK-03 | Sostituisci `combineDateTime`/`parseDateTime` in `TaskModal.tsx` | Usa i helper condivisi sia in scrittura (submit) sia in lettura (precompilamento form di modifica) | Impl | TASK-01 |
| DONE | TASK-04 | Correggi derivazione `timeStr` in `calendarService.ts` | Deriva l'etichetta oraria da `splitLocalDateTime` sul valore già parsato, non da string-slicing della stringa ISO grezza | Impl | TASK-01 |
| DONE | TASK-05 | Correggi mapping `medical_expiry` in `calendarService.ts` | Parsing manuale della data bare (pattern `AddAthleteModal.tsx`) prima di assegnarla a `CalendarEvent.date` | Impl | TASK-01 |
| DONE | TASK-06 | Test integrazione creazione task e lettura calendario | Crea un task a un orario locale noto via `staffService`, verifica che `calendarService.getEventsForMonth()` lo posizioni nel giorno/ora corretti | Test | TASK-03, TASK-04 |
| DONE | TASK-07 | Verifica manuale UI (orario, giorno, stabilità multi-mese) | Avviare il dev server: evento alle 18:00 mostrato alle 18:00 nel giorno giusto; evento alle 23:30 stabile navigando tra mesi; badge visita medica nel giorno corretto | Test | TASK-03, TASK-04, TASK-05, TASK-06 |

---

_Piano generato via Archetipo Planning — 2026-07-08_
