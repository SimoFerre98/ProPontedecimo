# US-021: Esportazione Excel di atleti e pagamenti — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-10

---

## User Story

**Epic:** EP-008 — Reportistica & Esportazione
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come Dirigente,
voglio esportare in formato `.xlsx` le tabelle di atleti e pagamenti rispettando i filtri applicati,
così che i dati possano essere condivisi e lavorati fuori dal gestionale (commercialista, federazione).

**Criteri di Accettazione**
- [ ] Le liste atleti e pagamenti hanno un pulsante di esportazione `.xlsx` (SheetJS)
- [ ] L'export rispetta i filtri e l'ordinamento attivi al momento dell'esportazione
- [ ] Il file esportato ha intestazioni di colonna leggibili in italiano e si apre correttamente in Excel
- [ ] L'esportazione è disponibile solo ai ruoli autorizzati a vedere quei dati

> **Nota di scope (Emanuele):** il campo "Demonstrates" parla di un file che contiene "esattamente le righe visualizzate", ma sia `Athletes.tsx` sia `Payments.tsx` sono paginate lato server (12 e 15 righe a pagina rispettivamente). Presa alla lettera, questa frase avrebbe reso l'export quasi inutile per l'uso dichiarato nella story (condividere i dati con commercialista/federazione): un settore da 40 atleti avrebbe prodotto un file da 12 righe. Confermato con l'utente: l'export deve contenere **tutte le righe che rispettano i filtri attivi, non solo la pagina corrente**. Confermato anche che l'export atleti deve includere l'**anagrafica completa** (codice fiscale, indirizzo, contatti dei genitori, matricola FIGC) e non solo le colonne oggi visibili nella tabella a schermo, perché è quello il dato utile per gli usi esterni citati nella story. L'export pagamenti non ha lo stesso problema di colonne: la tabella a schermo già mostra tutti i campi rilevanti (atleta, rata, scadenza, importo, metodo, ricevuta, stato).

---

## Soluzione Tecnica

📐 **Leonardo:** `xlsx` (SheetJS) è già una dipendenza del progetto — non lo installiamo, verifichiamo solo come non sia ancora usato da nessuna parte del codice, quindi introduciamo il primo punto di integrazione. L'unico pezzo di logica non banale è ottenere "tutte le righe che rispettano i filtri" quando sia `Athletes.tsx` sia `Payments.tsx` oggi caricano solo una pagina alla volta: la soluzione più semplice — non una nuova RPC, non un endpoint dedicato — è una seconda funzione di servizio che riusa esattamente la stessa costruzione di filtri delle funzioni `getPlayers`/`getPayments` già esistenti, ma senza `.range()`. Il generatore di file (SheetJS `json_to_sheet` + `writeFile`) è identico per entrambe le pagine, quindi va estratto in un'unica utility condivisa invece di duplicare la stessa chiamata due volte.

- Nuova utility `src/lib/xlsxExport.ts`: funzione `exportToXlsx(rows: Record<string, unknown>[], filename: string, sheetName: string)` che avvolge `XLSX.utils.json_to_sheet` + `XLSX.utils.book_new`/`book_append_sheet` + `XLSX.writeFile` — punto unico di dipendenza da SheetJS, riusato da entrambe le pagine.
- `athleteService.ts`: la costruzione dei filtri di `getPlayers` (search, sector, season, isActive, isRegistered, medicalStatus, privacyStatus, registrationStatus, sort) viene estratta in una funzione privata condivisa; una nuova `getPlayersForExport(...)` la riusa senza `.range()` e senza `{ count: 'exact' }`, restituendo tutte le righe corrispondenti. Nessuna migrazione: la RLS su `players` (US-002) filtra già le righe visibili per ruolo esattamente come fa oggi `getPlayers`.
- `paymentService.ts`: stessa estrazione per `getPayments` → `getPaymentsForExport(search, status, seasonId)`, senza `.range()`. Il coach non vede comunque alcuna riga (nessuna policy `payments_select_*_coach` da US-002), quindi la funzione restituisce un array vuoto per lui senza bisogno di controlli aggiuntivi lato servizio.
- `Athletes.tsx` / `Payments.tsx`: nuovo pulsante "Esporta Excel" accanto ai controlli filtro esistenti, disabilitato quando `totalCount === 0` (nessun file vuoto da generare) e durante il fetch (stato di caricamento dedicato, stesso pattern di `updatingId`/`sendingResetId` già usato in `SettingsModal.tsx`). Al click: richiama la funzione `*ForExport` con lo stato dei filtri correntemente applicato (`filters`, `search`, `sectorFilter`/`statusFilter`, `selectedSeasonId`), mappa ogni riga in un oggetto con chiavi in italiano, e chiama `exportToXlsx`.
- Colonne atleti (anagrafica completa, confermato con l'utente): Cognome, Nome, Data di Nascita, Luogo di Nascita, Codice Fiscale, Indirizzo, Città, CAP, Telefono, Email, Genitore 1 (Nome/Telefono/CF), Genitore 2 (Nome/Telefono/CF), Settore, Matricola FIGC, Tesserato, Scadenza Visita Medica, Stato (Attivo/Non Attivo).
- Colonne pagamenti (già tutte visibili a schermo, nessuna scelta da fare): Cognome, Nome, Settore, Rata, Piano, Scadenza, Importo Previsto, Importo Pagato, Metodo, N. Ricevuta, Data Ricevuta, Stato.
- Il pulsante export atleti è visibile a `president`/`director`/`coach` (stessi ruoli che già vedono la pagina Atleti secondo `RoleGuard` e la RLS di US-002 — il coach esporta solo gli atleti della propria leva, comportamento già garantito dalla policy `players_select_coach` esistente, non introduciamo nulla di nuovo). Il pulsante export pagamenti è visibile solo a `president`/`director` (stesso gate `isAdmin` già usato altrove): il coach non ha mai avuto accesso ai dati finanziari (US-002 ha rimosso esplicitamente `payments_select_coach`), quindi mostrargli un pulsante che produce sempre un file vuoto sarebbe fuorviante.

🔧 **Ugo:** Rischio contenuto: tocchiamo due service esistenti (aggiungendo funzioni, non modificandone il comportamento attuale) e due pagine già isolate. L'unico punto a cui fare attenzione è che `getPlayersForExport`/`getPaymentsForExport` per un circolo con centinaia di atleti restano comunque query singole senza `.range()` — dimensione ragionevole per una società sportiva locale, non serve streaming o export a chunk.

🔎 **Emanuele:** Confermo che la soluzione copre tutti gli AC: il primo con il nuovo pulsante su entrambe le pagine, il secondo perché `*ForExport` riusa la stessa costruzione di filtri/ordinamento già applicata a schermo, il terzo con `exportToXlsx` e intestazioni italiane esplicite, il quarto perché il pulsante è gated per ruolo lato UI e la RLS esistente resta comunque l'ultima linea di difesa lato dati.

---

## Strategia di Test

🧪 **Mina:** Il punto critico da verificare non è SheetJS in sé (libreria matura, già usata in produzione altrove) ma che l'export rifletta davvero i filtri/ordinamento attivi e non solo la pagina corrente, e che il gate per ruolo sia coerente con quanto RLS già impone sui dati sottostanti.

- **Manuale (atleti, ambito export):** applicare un filtro (es. Settore = "Under 15" o Visita Medica = "Scaduta") su un dataset con più di 12 risultati (più di una pagina); verificare che il file esportato contenga tutte le righe corrispondenti, non solo i 12 della pagina visibile.
- **Manuale (atleti, colonne):** verificare che il file contenga le colonne dell'anagrafica completa (incluso codice fiscale, indirizzo, contatti genitori) con intestazioni in italiano leggibili, e che si apra senza errori in Excel/LibreOffice.
- **Manuale (pagamenti, ambito + colonne):** filtrare per stato "Scaduti" su un dataset con più di 15 risultati; verificare che il file contenga tutte le rate scadute con le colonne attese e intestazioni italiane.
- **Manuale (ruoli):** login come `coach` → il pulsante export su Atleti è visibile e produce un file con solo gli atleti della propria leva (coerente con `players_select_coach`); su Pagamenti il pulsante export non è visibile. Login come `president`/`director` → entrambi i pulsanti visibili e funzionanti su tutti i dati.
- **Manuale (dataset vuoto):** applicare un filtro che non produce risultati; verificare che il pulsante di esportazione sia disabilitato invece di generare un file vuoto.
- **Regressione:** nessuna migrazione, ma `getPlayers`/`getPayments` vengono refactored per condividere la costruzione dei filtri con le nuove funzioni `*ForExport` — rilanciare `npm run test:integration` e verificare manualmente che le liste a schermo (filtri, paginazione, ordinamento) si comportino esattamente come prima del refactor.
- **Type-check:** `npx tsc --noEmit` dopo le modifiche a `athleteService.ts`, `paymentService.ts`, `Athletes.tsx`, `Payments.tsx`.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Utility condivisa `exportToXlsx` | Nuovo `src/lib/xlsxExport.ts`: genera e scarica un file `.xlsx` da un array di righe con SheetJS, unico punto di dipendenza dalla libreria | Impl | - |
| DONE | TASK-02 | `athleteService.getPlayersForExport` | Estrarre la costruzione filtri di `getPlayers` in una funzione condivisa; aggiungere una variante senza `.range()` che restituisce tutte le righe corrispondenti ai filtri/ordinamento attivi | Impl | - |
| DONE | TASK-03 | Pulsante "Esporta Excel" in Athletes.tsx | Nuovo pulsante accanto ai Filtri, disabilitato se `totalCount === 0`, con stato di caricamento; mappa i risultati di `getPlayersForExport` sull'anagrafica completa con intestazioni italiane e chiama `exportToXlsx` | Impl | TASK-01, TASK-02 |
| DONE | TASK-04 | Verifica manuale export atleti (ambito + colonne) | Filtro con più di una pagina di risultati: il file contiene tutte le righe corrispondenti (non solo la pagina corrente), anagrafica completa, intestazioni italiane, apertura corretta in Excel | Test | TASK-03 |
| DONE | TASK-05 | `paymentService.getPaymentsForExport` | Stessa estrazione per `getPayments`: variante senza `.range()` che rispetta search/stato/stagione attivi | Impl | - |
| DONE | TASK-06 | Pulsante "Esporta Excel" in Payments.tsx | Nuovo pulsante gated a `president`/`director` (il coach non ha mai visibilità sui pagamenti via RLS), stesso pattern di stato/loading di TASK-03 | Impl | TASK-01, TASK-05 |
| DONE | TASK-07 | Verifica manuale export pagamenti (ambito + colonne) | Filtro "Scaduti" con più di una pagina di risultati: il file contiene tutte le rate scadute con le colonne attese e intestazioni italiane | Test | TASK-06 |
| DONE | TASK-08 | Verifica manuale gating per ruolo | Login come `coach`: export Atleti visibile e limitato alla propria leva, export Pagamenti non visibile. Login come `president`/`director`: entrambi visibili e completi | Test | TASK-03, TASK-06 |
| DONE | TASK-09 | Regressione e type-check | `npm run test:integration` (verifica che il refactor dei filtri condivisi non rompa le liste a schermo) + `npx tsc --noEmit` | Test | TASK-02, TASK-03, TASK-05, TASK-06 |

---

_Piano generato via Archetipo Planning — 2026-07-10_
