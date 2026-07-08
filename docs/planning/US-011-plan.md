# US-011: Notifica per matricola mancante — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-08

---

## User Story

**Epic:** EP-003 — Anagrafica Atleti & Validazione
**Priorità:** LOW | **Story Points:** 2

**Story**
Come Dirigente,
voglio un badge/alert visibile in Dashboard o nella lista atleti che segnali gli atleti senza matricola,
così che nessun nuovo iscritto resti privo di matricola per dimenticanza.

**Criteri di Accettazione**
- [ ] Un indicatore visibile (badge o alert) mostra il numero di atleti attivi senza matricola (dipende da US-010)
- [ ] Dall'indicatore è possibile raggiungere l'elenco degli atleti interessati
- [ ] L'indicatore scompare quando tutti gli atleti attivi hanno la matricola

> ℹ️ **Nota di scoping:** la story lascia scegliere tra Dashboard e lista atleti. Si è scelta la **lista atleti** (`Athletes.tsx`) perché: (1) US-010 ha già reso visibile la matricola proprio in quella pagina; (2) `Dashboard.tsx` si appoggia alla RPC `get_dashboard_stats`, che risulta definita due volte in Postgres con firme diverse (`get_dashboard_stats()` da baseline e `get_dashboard_stats(p_season_id uuid)` da US-007) e payload di output incompatibili tra loro — un bug preesistente e fuori scope che sarebbe rischioso ereditare aggiungendoci sopra un nuovo conteggio.

---

## Soluzione Tecnica

L'indicatore riusa due pattern già presenti in `Athletes.tsx`, senza introdurre astrazioni nuove: il banner cliccabile condizionale (già usato per "Pagamenti in Sospeso") e il filtro a due stati `all`/`missing` (già usato per `privacyStatus`).

- Nuovo filtro `registrationStatus: 'all' | 'missing'` in `FiltersState` (`Athletes.tsx`), con relativo blocco UI nel pannello filtri (clone del blocco "Privacy") e chip rimovibile accanto agli altri filtri attivi
- `athleteService.getPlayers` accetta il nuovo filtro e applica `.is('figc_registration', null)` quando `registrationStatus === 'missing'`, seguendo lo stesso `if` già presente per `medicalStatus === 'missing'`
- Nuovo metodo leggero `athleteService.getMissingRegistrationCount(seasonId?)`: query `count: 'exact', head: true` su `players` con `is_active = true`, `figc_registration is null` e, se presente, `season_id = seasonId` — stesso stile di `paymentService.getOverdueCount()`
- Banner condizionale in `Athletes.tsx` (renderizzato solo se il count è > 0, quindi sparisce automaticamente quando tutti gli atleti attivi hanno la matricola), posizionato accanto al banner pagamenti esistente, stile "amber" (avviso, non errore) invece di "red". Al click imposta `filters`/`pendingFilters` su `{ ...DEFAULT_FILTERS, isActive: 'active', registrationStatus: 'missing' }` e resetta `page` a 0 — nessuna navigazione fuori pagina, il risultato è immediatamente visibile nella stessa lista
- Il conteggio è recuperato con `useQuery` (`queryKey: ['missingRegistrationCount', selectedSeasonId]`), invalidato insieme a `['players']` così il banner si aggiorna subito dopo che un dirigente compila la matricola di un atleta

---

## Strategia di Test

La logica nuova è concentrata nel filtro server-side e nel conteggio: la strategia copre entrambi con test di integrazione contro Supabase locale, più verifica manuale della UI.

- Integrazione (`scripts/test-*.mjs` o suite dedicata): inserire atleti attivi con e senza `figc_registration` in una stagione di test, verificare che `registrationStatus: 'missing'` nel filtro restituisca solo quelli senza matricola e che gli atleti non attivi non alterino il conteggio
- Integrazione: verificare che il conteggio scenda a 0 (e quindi il banner sparisca) dopo aver valorizzato la matricola dell'ultimo atleta mancante
- Verifica visiva manuale (via preview): banner assente quando tutti gli atleti attivi hanno matricola, presente con count corretto altrimenti; click sul banner applica il filtro e la lista mostra solo gli atleti attesi

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Aggiungi filtro `registrationStatus` a `athleteService.getPlayers` | In `athleteService.ts`, estendere il tipo `filters` e la query con `.is('figc_registration', null)` quando `registrationStatus === 'missing'`, seguendo il pattern di `medicalStatus` | Impl | - |
| DONE | TASK-02 | Aggiungi `athleteService.getMissingRegistrationCount` | Nuovo metodo count-only (`head: true`) su `players` filtrato per `is_active = true`, `figc_registration is null` e `season_id` opzionale | Impl | - |
| DONE | TASK-03 | Test integrazione filtro e conteggio matricola mancante | Script `scripts/test-*.mjs` che copre: filtro `registrationStatus=missing`, esclusione atleti non attivi, azzeramento del conteggio dopo compilazione matricola | Test | TASK-01, TASK-02 |
| DONE | TASK-04 | Aggiungi `registrationStatus` a `FiltersState` in `Athletes.tsx` | Estendere tipo, `DEFAULT_FILTERS`, `activeFilterCount`, blocco UI pannello filtri (clone del blocco Privacy) e chip filtro attivo rimovibile | Impl | TASK-01 |
| DONE | TASK-05 | Aggiungi banner "Matricola Mancante" in `Athletes.tsx` | `useQuery` su `getMissingRegistrationCount`, banner condizionale stile amber (clone del banner pagamenti), click che imposta i filtri su atleti attivi senza matricola | Impl | TASK-02, TASK-04 |
| DONE | TASK-06 | Verifica manuale UI (banner e filtro) | Avviare il dev server, verificare comparsa/scomparsa del banner al variare del count e corretto filtraggio al click, con e senza dati di test | Test | TASK-04, TASK-05 |

---

_Piano generato via Archetipo Planning — 2026-07-08_
