# US-050: Guida — Gestione Atleti e Anagrafica — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-27

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** MEDIUM | **Story Points:** 2

**Story**
Come utente con accesso alla sezione Atleti, voglio un capitolo della guida che mostri passo-passo, con screenshot, come cercare, aggiungere e modificare un atleta e gestirne la matricola, così che possa gestire l'anagrafica senza commettere errori o dover chiedere supporto.

**Criteri di Accettazione**
- [ ] Il capitolo "Gestione Atleti" spiega, con screenshot, come raggiungere la pagina Atleti dal menu principale
- [ ] Sono documentati passo-passo, con uno screenshot per ogni passaggio significativo: creazione di un nuovo atleta, modifica dei dati di un atleta esistente, inserimento/gestione del numero di matricola
- [ ] È spiegato in linguaggio non tecnico il significato dei campi obbligatori e dei messaggi di errore di validazione più comuni (vedi US-009)
- [ ] È documentato il significato della notifica di matricola mancante e come risolverla (vedi US-011)

---

## Soluzione Tecnica

Questa story estende l'infrastruttura guida di US-049 con il primo capitolo di contenuto reale, e introduce una decisione che riguarda quell'infrastruttura condivisa: la pagina Atleti (e quindi questo capitolo) è visibile solo ai ruoli Staff (`president`/`director`/`coach` — `RoleGuard` nega `/atleti` a `player`/`parent`), quindi il capitolo non deve comparire affatto nell'indice quando la Guida è aperta dal Portale, non solo restare "in arrivo". Il capitolo riusa il pattern illustrativo già stabilito da `PrimiPassiChapter.tsx` (illustrazioni JSX con callout numerati anziché screenshot reali — un file immagine non è persistibile su disco con gli strumenti disponibili in questa sessione, come già emerso e approvato durante US-049) invece di introdurre un nuovo mockup dedicato.

- Estensione di `GuideChapter` (`src/data/guideChapters.tsx`) con il campo `audience: 'staff' | 'portal' | 'both'`; l'entry `gestione-atleti` passa da `coming-soon` a `available` con `audience: 'staff'` e `Component: GestioneAtletiChapter`, mentre `primi-passi` resta implicitamente `both` (nessuna modifica di comportamento per il capitolo già esistente).
- `src/pages/Guide.tsx` filtra `GUIDE_CHAPTERS` per `audience` in base alla `variant` già calcolata da `useLocation()` (introdotta in US-049) prima di renderizzare l'indice, e ricalcola la numerazione (`index + 1`) sull'elenco filtrato — non su quello completo — così l'indice resta contiguo sia su Staff (5 capitoli visibili) sia su Portale (dove "Gestione Atleti" non compare).
- Nuovo componente `src/components/guide/chapters/GestioneAtletiChapter.tsx` (`variant` non necessaria: il capitolo è mostrato solo in contesto Staff) con le illustrazioni per i quattro AC, verificate contro il codice reale: (1) pulsante "Nuovo Atleta" in `Athletes/index.tsx` e colonna "Matricola" della tabella; (2) tab "Anagrafica" di `AddAthleteModal.tsx` con i campi obbligatori (Nome, Cognome, Data di Nascita, Luogo di Nascita, Codice Fiscale, Cittadinanza, Settore/Leva) spiegati in linguaggio semplice; (3) tab "Sport & Note" con il campo "Matricola FIGC"; (4) traduzione in linguaggio non tecnico dei messaggi reali del trigger `trg_validate_player_fields` (es. "codice fiscale non valido", "contatti di un genitore obbligatori per i minorenni"); (5) il banner ambra "Matricola FIGC Mancante" di `AthleteBanners.tsx` e l'azione risolutiva (click sul banner → filtro automatico → apertura dettaglio atleta → tab "Sport & Note" → compilazione "Matricola FIGC").

---

## Strategia di Test

Come per US-049, la story non tocca database né RPC: nessuna suite `scripts/test-*.mjs` è interessata. La verifica segue lo stesso schema type-check + regressione + verifica manuale, con un controllo aggiuntivo specifico sul filtro per `audience` introdotto qui.

- `npx tsc --noEmit` per validare l'estensione del tipo `GuideChapter` e il nuovo componente.
- `npm run test:integration` come regressione generale, secondo la policy del progetto.
- Verifica manuale Staff: capitolo "Gestione Atleti" presente e selezionabile nell'indice, contenuto completo (5 illustrazioni), numerazione indice corretta (1-6 inclusi tutti i capitoli visibili).
- Verifica manuale Portale: il capitolo "Gestione Atleti" **non compare per nulla** nell'indice (né disponibile né "in arrivo") per un utente `parent`/`player`, e la numerazione dei capitoli visibili resta contigua.
- Verifica manuale responsive: leggibilità del nuovo capitolo (testo + illustrazioni) sotto i 640px, stessa modalità a indice impilato già validata in US-049.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Campo `audience` e filtro indice | Estendere `GuideChapter` con `audience: 'staff'\|'portal'\|'both'` in `guideChapters.tsx` e filtrare/rinumerare l'elenco in `Guide.tsx` in base a `variant` | Impl | - |
| DONE | TASK-02 | Componente `GestioneAtletiChapter.tsx` | Creare il capitolo con le 5 illustrazioni (pagina Atleti/pulsante Nuovo Atleta, tab Anagrafica, tab Sport & Note/Matricola, errori di validazione in linguaggio semplice, banner matricola mancante) | Impl | TASK-01 |
| DONE | TASK-03 | Registrazione capitolo | Aggiornare l'entry `gestione-atleti` in `guideChapters.tsx`: `status: 'available'`, `audience: 'staff'`, `Component: GestioneAtletiChapter` | Impl | TASK-02 |
| DONE | TASK-04 | Type-check e regressione | Eseguire `npx tsc --noEmit` e `npm run test:integration`, correggere eventuali errori | Test | TASK-03 |
| DONE | TASK-05 | Verifica manuale Staff/Portale e responsive | Verificare presenza/numerazione del capitolo su Staff, assenza totale su Portale, e leggibilità mobile | Test | TASK-03 |

---

_Piano generato via Archetipo Planning — 2026-07-27_
