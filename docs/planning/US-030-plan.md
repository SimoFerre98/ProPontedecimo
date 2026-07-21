# US-030: Visualizzazione convocazioni — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-17

---

## User Story

**Epic:** EP-011 — Portale Giocatore
**Priorità:** LOW | **Story Points:** 3

**Story**
Come Giocatore,
voglio vedere in una sezione dalla grafica moderna e accattivante se sono stato convocato per la prossima partita,
così che io sappia subito se e quando presentarmi, senza passaparola.

**Criteri di Accettazione**
- [ ] Il giocatore vede lo stato di convocazione per la prossima partita della propria leva (dipende da US-032)
- [ ] La convocazione mostra i dettagli utili: avversario, data, orario di ritrovo e inizio gara
- [ ] La grafica è moderna e adatta ai ragazzi senza risultare infantile, coerente col design system
- [ ] Il giocatore vede solo le proprie convocazioni

> **Nota (Emanuele):** requisito implicito non scritto negli AC ma derivato dall'invariante di US-032 — lo stato "convocato/non convocato" non deve mai essere determinabile dal giocatore prima che `events.call_up_published_at` sia valorizzato, anche attraverso il nuovo canale di lettura introdotto da questa story. Non è un AC nuovo, è la stessa garanzia di US-032 estesa al nuovo punto d'accesso.

---

## Soluzione Tecnica

Lo schema dati (tabella `call_ups`, colonne `opponent`/`team_sector`/`call_up_published_at` su `events`) è già stato posato da US-032 apposta per essere riusato qui, senza una seconda migrazione. L'unico pezzo mancante è un canale di lettura autorizzato: oggi il ruolo `player` non ha alcuna policy SELECT su `events` (invariante documentata in CLAUDE.md), quindi il giocatore non può leggere avversario/data/orari della propria partita nemmeno quando la riga `call_ups` gli è visibile. La soluzione replica il pattern già usato per `is_call_up_published()` — una funzione `SECURITY DEFINER` mirata a un solo caso d'uso — invece di aprire una policy SELECT generale su `events` per il ruolo player.

- **Nuova RPC `get_my_next_call_up()`** (SECURITY DEFINER, STABLE, `search_path` fissato a `public`, `REVOKE ... FROM public, anon` + `GRANT ... TO authenticated` come per `is_call_up_published`): risolve il player del chiamante da `players.profile_id = auth.uid()` sulla stagione attiva (`seasons.is_active = true`), poi cerca il prossimo evento `home_match`/`away_match` della sua leva con `start_date >= now()`, ordinato per `start_date` crescente. Ritorna avversario, tipo evento, data, orario di ritrovo/inizio e `is_called_up`. Tre esiti distinti, non un solo `null` generico: nessuna riga se il profilo non è collegato a un atleta attivo nella stagione corrente; riga con campi evento `NULL` se non c'è alcuna partita in programma per la leva; riga completa altrimenti.
- **Gate di pubblicazione applicato dentro la funzione, non delegato alla RLS**: `is_called_up` è calcolato come `call_up_published_at IS NOT NULL AND EXISTS (SELECT 1 FROM call_ups ...)`. Essendo SECURITY DEFINER la funzione bypassa comunque `call_ups_select_player`, quindi l'invariante "nessuna convocazione visibile prima della pubblicazione" va riaffermata esplicitamente nel corpo della funzione.
- **Nessuna nuova tabella, nessuna nuova policy RLS**: si amplia la superficie di lettura del ruolo player solo per un dato specifico (la propria prossima partita), non per `events` in generale — scelta deliberata per restare minimali su una tabella condivisa da più story (US-012/US-013/US-032/US-031).
- **Service layer**: `getMyNextCallUp()` aggiunto a `callUpService.ts` (stesso file di dominio di US-032, non un nuovo servizio), che chiama `supabase.rpc('get_my_next_call_up')`.
- **Frontend**: nuovo componente `NextCallUpCard.tsx` inserito in cima a `PortalDashboard.tsx`, visibile solo quando `isPlayer` (mai per `isParent`: gli AC riguardano solo il Giocatore e non esiste — né viene introdotta qui — una policy `call_ups_select_parent`, coerente con la nota già in CLAUDE.md). Aggiornamento tramite React Query con `refetchInterval` di 5 minuti (stesso meccanismo di `useNotifications.ts`, intervallo più corto perché l'informazione è più time-sensitive), niente Supabase Realtime — non è un pattern già in uso nel progetto e non è necessario per questo caso d'uso.
- **Riuso del mockup esistente**: `docs/mockups/US-032/player-view.html`, creato apposta durante la pianificazione di US-032 come riferimento di contesto per questa story, copre già 3 dei 4 stati richiesti (convocato / non convocato / bozza) sugli stessi token "Premium Glass". Il quarto stato (nessuna partita in programma) viene disegnato in implementazione seguendo lo stesso linguaggio delle empty-state già presenti in `Convocazioni.tsx`.

**Alternativa scartata**: policy `events_select_player` scoped per leva + join lato client con `call_ups`. Scartata perché apre una superficie di lettura permanente su `events` per un ruolo che oggi non la possiede, a fronte dello stesso risultato ottenibile con una funzione mirata a un solo dato.

---

## Strategia di Test

Il punto critico è la funzione SECURITY DEFINER: essendo un bypass esplicito della RLS, un solo bug espone lo stato di convocazione di un altro giocatore o lo rivela prima della pubblicazione — stessa classe di rischio già gestita per `is_call_up_published()` in US-032.

- **Integrazione (nuovo `scripts/test-player-next-callup.mjs`)**: un giocatore con partita futura pubblicata e convocazione presente → `is_called_up = true` con dettagli evento corretti; stesso giocatore, convocazione assente → `is_called_up = false`; partita futura non ancora pubblicata, indipendentemente dal contenuto reale di `call_ups` → `is_called_up` sempre `false`, ma avversario/data/orari comunque presenti; nessuna partita futura per la leva del giocatore → riga con campi evento `NULL`; profilo non collegato a nessun atleta attivo nella stagione corrente → nessuna riga; un secondo giocatore di un'altra leva non vede mai la partita del primo.
- **Regressione (obbligatoria pre-merge)**: `npx supabase db reset` seguito da `npm run test:integration` — in particolare `test-rls.mjs` e `test-call-ups.mjs`, per verificare che la nuova funzione non alteri il comportamento delle policy esistenti su `call_ups`/`events`.
- **Type-check**: `npx tsc --noEmit` dopo la rigenerazione dei tipi (nuova funzione in `Database['public']['Functions']`).
- **Manuale (UI, per ruolo)**: login come `player` collegato a una leva con partita pubblicata e convocazione presente → verifica stato "convocato" con dettagli corretti; rimuovi la convocazione (da `coach`) → verifica stato "non convocato"; ritira la pubblicazione (da `coach`) → verifica stato "bozza" senza rivelare l'esito; nessuna partita futura per la leva → verifica stato vuoto onesto; login come `parent` → verifica che la card non compaia affatto; verifica dark/light theme e viewport mobile (il giocatore userà prevalentemente il telefono).

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione: RPC `get_my_next_call_up()` | Funzione SECURITY DEFINER che risolve il player del chiamante sulla stagione attiva, trova la prossima partita della sua leva e calcola `is_called_up` con gate esplicito su `call_up_published_at`; `REVOKE`/`GRANT EXECUTE` come `is_call_up_published` | Impl | - |
| DONE | TASK-02 | Test integrazione RPC | Nuovo `scripts/test-player-next-callup.mjs`: convocato/non convocato, bozza (esito sempre nascosto), nessuna partita, profilo non collegato, isolamento tra leve diverse | Test | TASK-01 |
| DONE | TASK-03 | Rigenerazione tipi TypeScript | Rigenerare `src/types/database.ts` per includere `get_my_next_call_up` tra le Functions | Impl | TASK-01 |
| DONE | TASK-04 | Service layer: `getMyNextCallUp()` | Aggiunta a `callUpService.ts`, chiama la RPC e tipizza la risposta | Impl | TASK-03 |
| DONE | TASK-05 | Componente `NextCallUpCard.tsx` | Quattro stati grafici (convocato, non convocato, bozza, nessuna partita) più stato "profilo non collegato", basati su `docs/mockups/US-032/player-view.html`; `refetchInterval` 5 minuti | Impl | TASK-04 |
| DONE | TASK-06 | Integrazione in `PortalDashboard.tsx` | Card visibile solo per `isPlayer`, mai per `isParent`; nessuna modifica al contenuto genitore | Impl | TASK-05 |
| DONE | TASK-07 | Aggiornamento CLAUDE.md — Superfici condivise | Documentare `get_my_next_call_up()` come primo caso di lettura mirata di `events` per il ruolo player, come riferimento per US-031 (stesso bisogno) | Impl | TASK-01 |
| DONE | TASK-08 | Verifica manuale end-to-end multi-stato | Percorso completo dei 4 stati via browser su Supabase locale, più verifica che il genitore non veda la card | Test | TASK-06 |
| DONE | TASK-09 | Regressione completa | `npx supabase db reset` + `npm run test:integration` (in particolare `test-rls.mjs`, `test-call-ups.mjs`) + `npx tsc --noEmit` | Test | TASK-02, TASK-06 |

---

> 🎨 Nessun nuovo mockup generato per questa story: il riferimento visivo è `docs/mockups/US-032/player-view.html`, creato apposta durante la pianificazione di US-032 per anticipare questa vista giocatore.

_Piano generato via Archetipo Planning — 2026-07-17_
