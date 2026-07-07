# US-008: Wizard creazione nuova stagione — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-07

---

## User Story

**Epic:** EP-002 — Gestione Stagioni Sportive
**Priorità:** HIGH | **Story Points:** 5

**Story**
Come Dirigente,
voglio un wizard guidato per creare la nuova stagione sportiva scegliendo quali atleti importare e da quale leva, con suggerimento automatico dello scatto di leva in base all'anno di nascita,
così che il passaggio di stagione (1° luglio) avvenga in modo controllato e la stagione passata resti storicizzata.

**Criteri di Accettazione**
- [ ] Il wizard consente di selezionare quanti e quali giocatori importare e da quale leva
- [ ] Il sistema suggerisce automaticamente la leva di destinazione degli atleti in base all'anno di nascita (scatto di leva)
- [ ] È possibile creare nuove leve contestualmente alla nuova stagione
- [ ] La stagione precedente viene storicizzata e resta consultabile dal selettore stagione (dipende da US-007)
- [ ] Un wizard abbandonato a metà non lascia dati parziali nella nuova stagione

---

## Soluzione Tecnica

Le "leve" non sono un'entità a sé: sono il campo testo `team_sector` su `players`, quindi una leva nuova nasce semplicemente referenziandola da un atleta importato (AC3 senza nuove tabelle). Il wizard è un modale multi-step **interamente client-side fino alla conferma finale**: i quattro step accumulano stato in React e l'unico effetto sul database è una singola chiamata a una nuova funzione Postgres transazionale — se il wizard viene abbandonato non è mai partita, se fallisce fa rollback completo. L'AC5 (nessun dato parziale) è così garantito dall'architettura, non da logica di cleanup. La storicizzazione (AC4) arriva gratis dall'infrastruttura US-007: la vecchia stagione resta nel selettore, perde solo il flag `is_active`.

- **Migrazione SQL — RPC `create_season_from_wizard(p_name text, p_start_date date, p_end_date date, p_players jsonb)`**: in un'unica transazione crea la stagione (`UNIQUE(name)` già a schema gestito con errore esplicito), copia gli atleti selezionati (`p_players` = array di `{player_id, team_sector}`, dedupicato internamente) come **nuove righe** con `season_id` della nuova stagione, disattiva la stagione attiva corrente e attiva la nuova (l'indice parziale `seasons_active_unique` garantisce l'unicità). Ritorna id della nuova stagione e conteggio atleti importati.
- **Regole di copia atleti**: si copiano anagrafica, contatti, genitori, `team_sector` di destinazione, `medical_expiry` (la validità del certificato è una data, non una stagione) e `figc_registration` (la matricola persiste); `is_registered` riparte da `false` (il tesseramento è un fatto stagionale), `is_active` = `true`. **Non si copiano i pagamenti** (il trascinamento insoluti è US-016) né lo storico `medical_visits`, che resta agganciato alla riga giocatore della stagione storica.
- **Permessi**: la RPC è `SECURITY DEFINER` con check esplicito del ruolo (`president` o `director` via `get_user_role()`), perché le RLS attuali su `seasons` consentono la scrittura solo al president mentre la persona della story è il Dirigente. `GRANT EXECUTE` al solo ruolo `authenticated`.
- **`src/lib/leva.ts` (nuovo)** — `suggestLeva(birthYear, seasonStartYear)`: funzione pura che mappa l'anno di nascita sulle categorie FIGC (Piccoli Amici, Primi Calci, Pulcini, Esordienti, Giovanissimi, Allievi, Juniores) parametrizzate sull'anno di inizio della nuova stagione; isolata per poter tarare la regola senza toccare il wizard. Atleti senza `birth_date`: fallback sulla leva di provenienza, evidenziati nel wizard come "da verificare".
- **Service**: `seasonService.createSeasonFromWizard(...)` (wrapper RPC) e parametro `seasonId` opzionale su `athleteService.getUniqueSectors()`, che oggi legge le leve su tutte le stagioni mentre al wizard servono quelle della sola stagione sorgente.
- **`src/components/modals/NewSeasonWizardModal.tsx` (nuovo)** — modale sul pattern `Modal` esistente con stepper: ① dati stagione (nome precompilato es. "2026/2027", date default 1 lug → 30 giu), ② selezione atleti raggruppati per leva di provenienza con "seleziona tutti" per leva e contatori, ③ destinazione leve con suggerimento automatico modificabile e creazione nuove leve come testo libero (badge "nuova"), ④ riepilogo per leva di destinazione con avviso esplicito che la stagione corrente verrà storicizzata, e conferma.
- **Entry point in `DashboardLayout.tsx`**: voce "+ Nuova stagione" nel footer del dropdown stagioni, visibile solo a president/director (ruolo dallo store). Attenzione: oggi il dropdown non si apre con una sola stagione (`hasMultipleSeasons`) — per i ruoli admin deve aprirsi comunque, è il caso reale del primo utilizzo.
- **Post-successo**: invalidazione della query `['seasons']` e `setSelectedSeasonId(nuovaStagioneId)`; lo store US-007 ricalcola `activeSeasonId` da solo e tutte le viste si rifiltrano sulla nuova stagione.
- **Alternativa scartata**: orchestrare gli insert dal frontend (insert stagione → insert atleti → switch flag). Bocciata perché non atomica (violerebbe AC5 a ogni errore intermedio) e perché le RLS su `seasons` bloccherebbero il director.

---

## Strategia di Test

Il grosso del rischio è nel confine transazionale della RPC e nella regola dello scatto di leva; la UI del wizard si verifica con test di componente sulla navigazione e un e2e manuale del flusso completo.

- **RPC `create_season_from_wizard`** (integration, Supabase locale): happy path (stagione creata, N atleti copiati con leva di destinazione, vecchia stagione disattivata, nuova attiva — una sola `is_active = true`); **rollback** con `player_id` invalido nel payload → nessuna riga scritta, né stagione né atleti (dimostra AC5); nome stagione duplicato → errore gestito; chiamata con ruolo `coach` → errore di autorizzazione; payload con doppioni dello stesso atleta → una sola copia
- **Regole di copia** (integration): la riga copiata ha `is_registered = false`, `is_active = true`, conserva `medical_expiry` e `figc_registration`; nessun pagamento e nessuna `medical_visit` viene duplicata
- **`suggestLeva`** (unit): mapping corretto sui confini delle fasce d'età FIGC (es. anno che fa scattare Pulcini → Esordienti), parametrizzazione sull'anno di inizio stagione, anno di nascita fuori range → fallback
- **Wizard component** (unit/component con service mockato): navigazione avanti/indietro conserva lo stato; chiusura/abbandono del modale a ogni step → **zero chiamate di scrittura**; step 1 valida nome e date; step 3 mostra il suggerimento e permette override e nuova leva; la conferma chiama la RPC con il payload atteso
- **Flusso end-to-end** (e2e manuale): completare il wizard → la nuova stagione è attiva e selezionata, gli atleti importati compaiono nella leva corretta, la stagione precedente è consultabile dal selettore con i suoi atleti storici (AC4); atleta senza data di nascita → evidenziato e importato nella leva di provenienza
- **Non-regressione US-007** (smoke): con la nuova stagione attiva, Dashboard/Atleti/Pagamenti si filtrano correttamente e il cambio stagione dal dropdown continua a funzionare

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione RPC `create_season_from_wizard` | Funzione transazionale SECURITY DEFINER con check ruolo president/director: crea stagione, copia atleti da payload jsonb (con regole di copia e dedup), switch `is_active`. | Impl | - |
| DONE | TASK-02 | Test integration RPC | Su Supabase locale: happy path, rollback con player_id invalido (AC5), nome duplicato, ruolo non autorizzato, dedup payload, regole di copia (`is_registered=false`, no pagamenti). | Test | TASK-01 |
| DONE | TASK-03 | Utility `suggestLeva` in `src/lib/leva.ts` | Funzione pura anno di nascita → categoria FIGC parametrizzata sull'anno di inizio stagione; fallback per anni fuori range. | Impl | - |
| DONE | TASK-04 | Test unit `suggestLeva` | Confini delle fasce d'età FIGC, cambio anno stagione, fuori range. | Test | TASK-03 |
| DONE | TASK-05 | Service layer | `seasonService.createSeasonFromWizard()` (wrapper RPC) e parametro `seasonId` su `athleteService.getUniqueSectors()`. | Impl | TASK-01 |
| DONE | TASK-06 | Wizard step 1 — Dati stagione | Scaffold `NewSeasonWizardModal.tsx` con stepper e navigazione; step 1 con nome precompilato (es. "2026/2027"), date default 1 lug → 30 giu, validazione. | Impl | - |
| DONE | TASK-07 | Wizard step 2 — Selezione atleti | Atleti della stagione sorgente raggruppati per leva (`getUniqueSectors(seasonId)`), checkbox singolo e "seleziona tutti" per leva, contatori. | Impl | TASK-05, TASK-06 |
| DONE | TASK-08 | Wizard step 3 — Destinazione leve | Suggerimento via `suggestLeva` modificabile per gruppo, creazione nuova leva come testo libero con badge "nuova", evidenza atleti senza data di nascita. | Impl | TASK-03, TASK-07 |
| DONE | TASK-09 | Wizard step 4 — Riepilogo e conferma | Riepilogo per leva di destinazione, avviso storicizzazione, chiamata RPC con loading/errore; post-successo: invalidate `['seasons']` + `setSelectedSeasonId(nuova)`. | Impl | TASK-08 |
| DONE | TASK-10 | Test component wizard | Navigazione conserva stato, abbandono a ogni step senza scritture, validazioni step 1, payload RPC corretto alla conferma. | Test | TASK-09 |
| DONE | TASK-11 | Entry point in `DashboardLayout` | Voce "+ Nuova stagione" nel footer del dropdown stagioni per president/director; dropdown apribile anche con una sola stagione per i ruoli admin. | Impl | TASK-09 |
| DONE | TASK-12 | Test e2e flusso completo | Wizard completo → nuova stagione attiva e selezionata, atleti nella leva corretta, stagione precedente consultabile con dati storici (AC4); smoke non-regressione US-007. | Test | TASK-11 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-008/`

_Piano generato via Archetipo Planning — 2026-07-07_
