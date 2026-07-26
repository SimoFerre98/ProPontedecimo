# US-049: Infrastruttura guida in-app e voce di menu — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-26

---

## User Story

**Epic:** EP-015 — Documentazione e Supporto Utente
**Priorità:** HIGH | **Story Points:** 3

**Story**
Come utente di qualsiasi ruolo, spesso poco esperto di informatica, voglio una sezione "Guida" raggiungibile dal menu in alto a destra, accanto alle voci di gestione account, così che possa orientarmi nel sito senza dover chiedere aiuto ad altri.

**Criteri di Accettazione**
- [ ] Nel menu utente in alto a destra (lo stesso menu con le voci di gestione account/impostazioni, vedi US-018/US-020) è presente una voce "Guida" (o "Aiuto") chiaramente distinta dalle voci di configurazione account
- [ ] Cliccando la voce si apre una sezione dedicata interamente interna al sito (nessun redirect a PDF, wiki esterno o altro dominio)
- [ ] La sezione mostra un indice/sommario dei capitoli disponibili, navigabile senza ricaricare la pagina
- [ ] È presente almeno un capitolo "Primi passi" con testo semplice e non tecnico e almeno uno screenshot che mostra la struttura generale del sito (menu principale, posizione del menu utente, significato delle icone base)
- [ ] I contenuti (testo + immagini) sono gestiti come asset statici del progetto (Markdown o componenti React), senza necessità di un pannello di amministrazione dedicato
- [ ] La sezione è raggiungibile e leggibile correttamente anche da schermo mobile

---

## Soluzione Tecnica

La codebase ha già due dropdown profilo quasi identici — uno in `DashboardLayout.tsx` (ruoli staff: president/director/coach) e uno in `PortalLayout.tsx` (ruoli player/parent) — entrambi con lo stesso pattern di bottone (`Il mio Profilo`, eventualmente `Gestione Account`/`Invia Email` condizionati per ruolo, poi lo switch tema, poi Logout). La soluzione aggiunge la voce "Guida" in entrambi i dropdown, sempre visibile a qualunque ruolo (a differenza delle voci di configurazione account che sono condizionate), e una pagina dedicata raggiunta via routing client-side (React Router), non un'altra modale, perché il contenuto (indice + capitolo) deve restare navigabile e "linkabile" nel tempo man mano che le story di contenuto (US-050 → US-056) aggiungono capitoli.

- Nei due dropdown profilo (`src/layouts/DashboardLayout.tsx:349-384`, `src/layouts/PortalLayout.tsx:103-125`) viene aggiunto un bottone "Guida" (icona `BookOpen` di `lucide-react`, stesso pattern markup di "Il mio Profilo") subito dopo le voci condizionate da ruolo e prima del blocco switch-tema, che naviga a `/guida` (staff) o `/portal/guida` (player/parent) tramite `useNavigate()` — nessuna nuova modale, si chiude il dropdown e si cambia rotta.
- Registro capitoli statico in `src/data/guideChapters.tsx`: un array `{ id, title, description, icon, status: 'available' | 'coming-soon', Component }` — per questa story un solo capitolo `available` ("Primi passi", componente `src/components/guide/chapters/PrimiPassiChapter.tsx`), gli altri id previsti da US-050→US-056 (atleti, stagioni, pagamenti, presenze/calendario, profilo, reportistica, portali) elencati come `coming-soon` così l'indice mostra fin da subito la mappa completa della guida, coerente con la mappatura EP-015 in `docs/BACKLOG.md`.
- Pagina `src/pages/Guide.tsx`: layout a due colonne (indice capitoli a sinistra, contenuto del capitolo attivo a destra) con stato locale `activeChapterId` (nessun routing per-capitolo: un solo componente, cambio di contenuto senza ricaricare la pagina, come richiesto dagli AC); sotto la breakpoint `sm` l'indice diventa una lista a piena larghezza sopra il contenuto (stack verticale) invece delle due colonne affiancate, riusando le classi Tailwind già in uso nel progetto (`grid grid-cols-1 lg:grid-cols-12`, come in altre pagine con sidebar).
- `PrimiPassiChapter.tsx` contiene testo semplice (niente terminologia tecnica) più un componente `InterfacePreview` che ricrea in JSX/CSS la struttura reale dell'header (logo, selettore stagione, campanella, menu utente) con callout numerati sovrapposti — verificato contro uno screenshot reale della Dashboard loggata (utente di test locale) per fedeltà, ma implementato come illustrazione in codice invece di un asset immagine statico: resta sempre coerente con l'header vero perché ne riusa le stesse classi/etichette, e non richiede una pipeline di cattura/aggiornamento screenshot ogni volta che l'header cambia.
- Route `guida` aggiunta in `src/App.tsx` sia dentro il branch Staff (`<Route element={<DashboardLayout />}>`, path `atleti`/`pagamenti`/...) sia dentro il branch Portale (`<Route element={<PortalLayout />}>`), così la sezione è raggiungibile da ogni ruolo autenticato senza toccare `RoleGuard`/`ProtectedRoute`.

---

## Strategia di Test

Questa story non tocca database, RPC né RLS: non introduce nulla su cui gli script `scripts/test-*.mjs` (integrazione contro Supabase) abbiano presa, e il progetto non ha oggi un framework di test a livello di componente React (nessuna dipendenza di test runner/testing-library in `package.json` — solo Vite/ESLint/TypeScript). La verifica per questa story segue quindi la parte del processo di review in CLAUDE.md applicabile al frontend puro: type-check completo e verifica manuale mirata, non l'invenzione di una suite di componente isolata che il progetto non ha ancora.

- `npx tsc --noEmit` per validare i nuovi file (`guideChapters.tsx`, `PrimiPassiChapter.tsx`, `Guide.tsx`) e le modifiche ai due layout.
- `npm run test:integration` comunque eseguito prima del merge, secondo la policy del progetto, per escludere regressioni sulle suite esistenti (nessuna è attesa toccare questi file, ma la policy vale per ogni story, non solo per quelle con modifiche DB).
- Verifica manuale multi-ruolo: aprire il dropdown profilo come `president`/`director`/`coach` (Staff) e come `player`/`parent` (Portale), confermare che la voce "Guida" sia presente e visivamente distinta dalle voci di account, cliccarla e verificare la navigazione a `/guida` o `/portal/guida` senza reload di pagina (nessun full page refresh, restare in SPA).
- Verifica manuale del capitolo "Primi passi": contenuto leggibile, screenshot visibile e nitido, capitoli `coming-soon` mostrati ma non cliccabili/attivabili.
- Verifica manuale responsive: viewport < 640px, indice capitoli in stack sopra il contenuto, nessuno scroll orizzontale, testo e immagine leggibili senza zoom.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Registro capitoli e capitolo "Primi passi" | Creare `src/data/guideChapters.tsx` con il registro (1 capitolo `available` + i futuri come `coming-soon`) e `src/components/guide/chapters/PrimiPassiChapter.tsx` con l'illustrazione `InterfacePreview` (header ricreato in JSX + callout numerati) | Impl | - |
| DONE | TASK-02 | Pagina `Guide.tsx` | Creare `src/pages/Guide.tsx`: colonna indice capitoli (attivo/disponibile vs coming-soon) + colonna contenuto capitolo attivo, stack verticale sotto `lg`, nessun reload al cambio capitolo | Impl | TASK-01 |
| DONE | TASK-03 | Voce "Guida" nei due dropdown e routing | Aggiungere il bottone "Guida" in `DashboardLayout.tsx` e `PortalLayout.tsx` (icona `BookOpen`, visibile a ogni ruolo) e registrare le rotte `guida` nel branch Staff e nel branch Portale in `App.tsx` | Impl | TASK-02 |
| DONE | TASK-04 | Type-check e regressione | Eseguire `npx tsc --noEmit` e `npm run test:integration`, correggere eventuali errori | Test | TASK-03 |
| DONE | TASK-05 | Verifica manuale multi-ruolo e responsive | Verificare su desktop e mobile, per almeno un ruolo Staff e uno Portale, apertura del dropdown, navigazione alla Guida e leggibilità del capitolo "Primi passi" | Test | TASK-03 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-049/`

_Piano generato via Archetipo Planning — 2026-07-26_
