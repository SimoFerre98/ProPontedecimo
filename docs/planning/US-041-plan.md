# US-041: Revisione contrasti e leggibilità del tema scuro — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-22

---

## User Story

**Epic:** EP-001 — Fondamenta Tecniche & Qualità del Codice
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come utente della piattaforma, voglio che tutti gli elementi dell'interfaccia siano ben leggibili sia nel tema scuro che in quello chiaro, così che nessuna informazione (testi secondari, bordi, badge, placeholder) risulti poco visibile o si perda sullo sfondo.

**Criteri di Accettazione**
- [ ] Audit sistematico di leggibilità su tutte le pagine e i modali, in entrambi i temi, con elenco dei punti critici documentato
- [ ] Gli elementi poco visibili individuati (testi `muted`, bordi `white/5`, placeholder, badge, stati disabled) raggiungono un contrasto adeguato — riferimento indicativo WCAG AA per il testo
- [ ] Le correzioni passano dai token centralizzati in `src/index.css` dove esistono (niente fix puntuali sparsi che divergono dal design system)
- [ ] Il carattere Premium Glass (glassmorfismo, palette bordeaux/oro) è preservato: si corregge il contrasto, non si stravolge l'estetica
- [ ] Verifica finale in entrambi i temi senza regressioni visive

---

## Audit — Punti critici individuati

Un audit grep sistematico su `src/` ha quantificato il problema:

| Pattern | Occorrenze | File coinvolti |
|---|---|---|
| `text-primary` / `border-primary` / `bg-primary/N` senza variante `dark:` | 480 (201+153+126) | 45+ |
| `white/N` / `black/N` raw su bordi/superfici | 421 | 49 |
| `text-muted-foreground/N` (doppio smorzamento) | 228 | 33 |
| Colori hardcoded (hex/rgb/oklch) fuori dai token | ~35 | 15 |
| `disabled:opacity-*` | ~25 | 15 |
| Placeholder con opacità ridotta | 15 | 12 |

**Causa radice #1 — il token `--primary` cambia significato tra i due temi (segnalata direttamente da Simone: "elementi granata che in dark diventano bianchi").** In `:root`, `--primary` è il bordeaux di brand (`oklch(0.33 0.13 15)`); in `.dark` è ridefinito a `oklch(0.922 0 0)` — **quasi bianco** — perché quel token, per convenzione shadcn, serve solo come sfondo dei bottoni primari (dove in dark deve essere chiaro-su-scuro). Il problema è che **201 usi di `text-primary` e 153 di `border-primary`** trattano il token come "colore di marchio bordeaux" per icone di intestazione, parole in evidenza nei titoli, badge filtro, focus state, nomi atleta parzialmente colorati, link (`Button variant="link"`, [button-variants.ts:17](../../src/components/ui/button-variants.ts:17)) — **nessuno di questi ha una variante `dark:` accanto**. In molti casi (icon-box `bg-primary/20 text-primary border-primary/20`, ~126 occorrenze) sfondo *e* testo derivano dallo stesso token: in dark diventano entrambi bianco, annullando il contrasto anche se l'elemento resta "presente". Interessante: il mockup di US-005 (`docs/mockups/US-005/shared.css`) aveva già anticipato la soluzione con un token `--primary-soft: oklch(0.62 0.19 12)` commentato "bordeaux leggibile su scuro (accenti testuali)" — mai però riportato in `src/index.css`, dove `--primary-soft` esiste ma con un significato diverso (tinta a opacità, non tonalità alternativa) e **soffre dello stesso bug** (`oklch(0.922 0 0 / 0.2)` in dark). Bug collaterale, non di contrasto: `rgba(var(--primary), 0.6)` in [CalendarModal.tsx:183](../../src/components/modals/CalendarModal.tsx:183) e [TaskTimeline.tsx:157](../../src/components/tasks/TaskTimeline.tsx:157) è sintassi CSS non valida (`--primary` è un valore oklch, non una tripletta RGB) — il browser scarta silenziosamente quel `box-shadow`, indipendentemente dal tema.

**Uso legittimo di `--primary` da NON toccare:** `bg-primary` puro abbinato a `text-primary-foreground` (bottoni primari, es. `button-variants.ts` variante `default`) — qui il flip chiaro/scuro del token è corretto e voluto, `--primary-foreground` si inverte di conseguenza.

**Causa radice #2 nel layer dei token:** `--muted-foreground` in `.dark` (`oklch(0.708 0 0)`) è già di per sé un grigio medio-chiaro; il problema è che centinaia di punti applicano un'ulteriore opacità (`/20`–`/50`) sopra testo o bordi già attenuati, bypassando `--border-soft`/`--surface-05`/`--border-strong` — token che esistono già e sono pensati per adattarsi ai due temi, ma vengono ignorati a favore di classi `white/N` scritte a mano.

**File a più alto impatto combinato per il bug `--primary`:** `src/pages/Athletes/components/AthleteFilterPanel.tsx` (6 badge filtro), `src/layouts/DashboardLayout.tsx` e `src/layouts/PortalLayout.tsx` (sidebar/nav visibili su ogni pagina), tutte le modali con icon-box di intestazione (`AddAthleteModal`, `AddInventoryModal`, `CalendarModal`, `EventModal`, `MedicalVisitModal`, `TaskModal`, `SettingsModal`, `SendEmailModal`, `RequestChildLinkModal`), le viste tabella/griglia atleti (nome con parte del cognome in `text-primary`).

**Casi isolati ad alta severità, non risolvibili per propagazione dai token:**
- [LoginPage.tsx:72,89](../../src/pages/LoginPage.tsx:72), [RegisterPage.tsx](../../src/pages/RegisterPage.tsx), [RecoveryPage.tsx](../../src/pages/RecoveryPage.tsx): i campi input forzano `bg-white text-gray-900` senza alcuna variante `dark:` — restano un rettangolo bianco acceso in piena UI scura. Il fix di contrasto già fatto in US-039 su queste pagine ha toccato altri elementi, non gli input.
- [NewSeasonWizardModal.tsx](../../src/components/modals/NewSeasonWizardModal.tsx): 30 occorrenze di `white/N` **senza alcuna condizionale `.dark:`** — l'intero modale è stato costruito assumendo un solo tema.
- Colori hardcoded fuori sistema: tooltip inline di [FinancialTrendChart.tsx:108](../../src/components/charts/FinancialTrendChart.tsx:108) (`color: '#fff'`), gauge radiale di [SendEmailModal.tsx](../../src/components/modals/SendEmailModal.tsx) (`#ef4444`, `#f59e0b`, `#6366f1`, `#10b981`), `#800020` ripetuto in 15+ punti invece di `var(--primary)`.

**Pattern duplicato, candidato a componente condiviso:** la combinazione `bg-white/5 border-white/10 text-muted-foreground` (badge di stato "vuoto/neutro") è ripetuta identica in 8 file: `MedicalStatusIndicator.tsx`, `ChildBillingCard.tsx`, `ProfileModal.tsx`, `TaskListView.tsx`, `Convocazioni.tsx`, `Payments.tsx`, `Inventory.tsx`, `MedicalVisits.tsx`.

**File con maggiore concentrazione di occorrenze raw** (target prioritario per la propagazione): `AddAthleteModal.tsx`, `NewSeasonWizardModal.tsx`, `Attendance.tsx`, `Convocazioni.tsx`, `Payments.tsx`, `SettingsModal.tsx`, `EventModal.tsx`, `TaskModal.tsx`, `NewPaymentModal.tsx`, `SendEmailModal.tsx`.

---

## Soluzione Tecnica

L'intervento è strutturato su quattro livelli per rispettare l'AC "niente fix puntuali sparsi": introdurre un token dedicato per l'accento di marchio (il fix a maggiore impatto, 480 occorrenze), rinforzare i token esistenti così che la correzione si propaghi automaticamente alla maggior parte degli altri ~700 punti individuati, estrarre un componente condiviso per il pattern di badge duplicato, e trattare a parte solo i casi che nessun token tocca perché bypassano il sistema di design.

- **Livello 0 — Nuovo token `--brand-accent` (il fix con più impatto):** `--primary` resta invariato per il suo uso corretto (sfondo bottoni, sempre abbinato a `text-primary-foreground`). Si introduce un token separato per l'uso "colore di marchio" — icone, parole in evidenza, badge filtro, focus state, link — che in chiaro coincide col bordeaux attuale ma in scuro usa una tonalità bordeaux più chiara e leggibile (`oklch(0.62 0.19 12)`, lo stesso valore già anticipato nel mockup di US-005 come "bordeaux leggibile su scuro"), invece di seguire il flip verso il quasi-bianco di `--primary`. Registrato in `@theme inline` come `--color-brand-accent` (stessa modalità con cui `--primary` è già esposto), così `text-primary`→`text-brand-accent`, `border-primary`→`border-brand-accent`, `bg-primary/N`→`bg-brand-accent/N` diventano una sostituzione di classe 1:1, propagata su tutti i file coinvolti. Il bottone `variant="link"` in `button-variants.ts` migra allo stesso token. I 2 usi di `rgba(var(--primary), 0.6)` (CSS non valido) vengono corretti nella stessa passata.
- **Livello 1 — Token esistenti (`src/index.css`):** alzare il floor minimo di opacità applicato a `text-muted-foreground` in combinazione con classi `/N`, e verificare/rinforzare `--border-soft`, `--border-strong`, `--surface-05` e `.field-input::placeholder` dove il contrasto misurato scende sotto la soglia indicativa WCAG AA nel tema scuro. Palette bordeaux/oro e struttura glassmorfica non vengono toccate: si tratta solo di innalzare i valori di opacità/luminosità dei token esistenti.
- **Livello 2 — Componente condiviso:** creare `Badge`/`StatusChip` in `src/components/ui/` (oggi non esiste alcun componente equivalente) con varianti basate sui token, e sostituire le 8 duplicazioni del pattern `bg-white/5 border-white/10 text-muted-foreground`.
- **Livello 3 — Casi isolati:** fix puntuali sui casi che non passano da nessun token perché non li usano affatto — input di Login/Register/Recovery, `NewSeasonWizardModal.tsx`, colori hardcoded fuori sistema — migrandoli sui token esistenti.
- **Propagazione controllata:** una volta rinforzati i token (Livello 0-1), sostituire le classi `white/N`/`black/N` raw più concentrate nei file identificati con le classi/token semantici equivalenti già esistenti (`border-border`, `--border-soft`, `--surface-05`) — è una sostituzione di classe, non nuova logica, e beneficia retroattivamente di qualunque ulteriore tuning fatto sui token.
- **Nessuna modifica al layer dati/backend**: la story è interamente frontend (CSS/token/componenti React), non tocca migrazioni né RLS.

---

## Strategia di Test

Il repository non ha infrastruttura di test visivo/e2e per il frontend (solo `scripts/test-*.mjs` di integrazione contro Supabase, non applicabili qui): la verifica è quindi prevalentemente manuale, ma ancorata a misurazioni oggettive dove possibile.

- Calcolo del rapporto di contrasto WCAG per le coppie di token toccate (testo/sfondo, bordo/sfondo, incluso il nuovo `--brand-accent`) nei due temi, prima e dopo la modifica ai token — per dare un riferimento oggettivo oltre alla verifica visiva.
- Verifica incrociata manuale, tema chiaro e tema scuro, su tutte le pagine/modali toccati dai task di propagazione (elenco file ad alta concentrazione sopra), con particolare attenzione ai casi rappresentati nei mockup (icona/badge di intestazione con accento di marchio, badge di stato, testo secondario doppiamente smorzato, placeholder, input di login, pulsante disabilitato).
- Grep di conferma post-migrazione: nessuna occorrenza residua di `text-primary`/`border-primary` fuori dai casi bottone legittimi, e nessuna regressione sui bottoni primari (`bg-primary` + `text-primary-foreground` deve restare intatto).
- Verifica di non-regressione estetica: il glassmorfismo e la palette bordeaux/oro devono restare riconoscibili dopo il fix — confronto visivo prima/dopo su almeno un modale e una pagina lista per ciascun tema.
- `npx tsc --noEmit` dopo l'introduzione del componente `Badge`/`StatusChip` e la sostituzione dei call site, per assicurare che nessuna prop/import sia rimasta orfana.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-00 | Introdurre il token `--brand-accent` e migrare gli usi di accento di `--primary` | Aggiungere `--brand-accent`/`--color-brand-accent` in `src/index.css` (bordeaux in chiaro, bordeaux chiaro leggibile in scuro); sostituire `text-primary`→`text-brand-accent`, `border-primary`→`border-brand-accent`, `bg-primary/N`→`bg-brand-accent/N` in tutti i punti dove l'uso è "colore di marchio" (icone, titoli, badge filtro, focus, link `variant="link"`) e NON negli usi legittimi `bg-primary`+`text-primary-foreground` (bottoni); correggere anche `rgba(var(--primary),...)` non valido in `CalendarModal.tsx` e `TaskTimeline.tsx` | Impl | - |
| TODO | TASK-01 | Rinforzare i token di contrasto in `src/index.css` | Alzare il floor minimo di opacità per `text-muted-foreground` stacking, `--border-soft`/`--border-strong`, `--surface-05` e `.field-input::placeholder` dove il contrasto scende sotto la soglia WCAG AA in dark, senza toccare palette bordeaux/oro | Impl | - |
| TODO | TASK-02 | Verificare i rapporti di contrasto dei token aggiornati | Calcolare il rapporto WCAG per le coppie di token toccate (testo/sfondo, bordo/sfondo, incluso `--brand-accent`) nei due temi, documentando i valori prima/dopo | Test | TASK-00, TASK-01 |
| TODO | TASK-03 | Creare componente condiviso `Badge`/`StatusChip` | Nuovo componente in `src/components/ui/` con varianti basate sui token; sostituire le 8 duplicazioni del pattern `bg-white/5 border-white/10 text-muted-foreground` in `MedicalStatusIndicator`, `ChildBillingCard`, `ProfileModal`, `TaskListView`, `Convocazioni`, `Payments`, `Inventory`, `MedicalVisits` | Impl | TASK-01 |
| TODO | TASK-04 | Correggere gli input di Login/Register/Recovery | Sostituire `bg-white text-gray-900` hardcoded con i token `bg-input`/`text-foreground`/`border-border` in `LoginPage.tsx`, `RegisterPage.tsx`, `RecoveryPage.tsx` | Impl | TASK-01 |
| TODO | TASK-05 | Rivedere `NewSeasonWizardModal.tsx` | Sostituire le 30 occorrenze di `white/N` senza condizionale `.dark:` con i token `--border-soft`/`--border-strong`/`--surface-05` (indipendente dal fix `--brand-accent` di TASK-00, che tocca lo stesso file per gli usi di `text-primary`) | Impl | TASK-01, TASK-00 |
| TODO | TASK-06 | Sistemare i colori hardcoded fuori dai token | Mappare tooltip di `FinancialTrendChart.tsx`, gauge radiale di `SendEmailModal.tsx` e le occorrenze di `#800020` sui token `var(--primary)`/`--chart-*`/`--rose`/`--gold`/`--emerald` dove sensato | Impl | TASK-01 |
| TODO | TASK-07 | Propagare i token sui file ad alta concentrazione | Sostituire le classi `white/N`/`black/N` raw e `text-muted-foreground/N` più concentrate in `Attendance.tsx`, `Convocazioni.tsx`, `Payments.tsx`, `SettingsModal.tsx`, `EventModal.tsx`, `TaskModal.tsx`, `NewPaymentModal.tsx`, `SendEmailModal.tsx`, `AddAthleteModal.tsx` con le classi/token semantici equivalenti | Impl | TASK-01, TASK-03 |
| TODO | TASK-08 | Verifica incrociata finale nei due temi | Checklist manuale su tutte le pagine/modali toccati, tema chiaro e scuro, con screenshot prima/dopo per i casi rappresentati nei mockup (incluso il fix `--brand-accent`) e per i file di TASK-05/TASK-07; conferma che gli usi legittimi di `bg-primary`+`text-primary-foreground` sui bottoni non siano stati alterati; conferma assenza di regressioni sul carattere Premium Glass; `npx tsc --noEmit` | Test | TASK-00, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06, TASK-07 |

> **Nota di stima:** l'ampiezza reale del problema (480 occorrenze di `--primary` usato come accento + 421 `white/N` + 228 `text-muted-foreground/N`, distribuite su 60+ file) eccede ampiamente quanto normalmente comporta una story da 3 punti se affrontata riga per riga. TASK-00 in particolare, benché meccanico (sostituzione di classe), tocca 45+ file e richiede attenzione per non alterare gli usi legittimi di `--primary` sui bottoni. Il piano contiene lo scope puntando sulla propagazione dai token (TASK-00/01/03 risolvono la maggioranza dei casi senza un secondo intervento manuale per file), ma TASK-07 e TASK-08 restano un lavoro non piccolo. Da rivedere la stima a preventivo con l'utente prima di passare a `IN PROGRESS`.

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-041/`

_Piano generato via Archetipo Planning — 2026-07-22_
