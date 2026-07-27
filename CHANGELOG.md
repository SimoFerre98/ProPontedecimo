# Changelog

Tutti i cambiamenti significativi al progetto Pro Pontedecimo saranno documentati in questo file.

## [Unreleased]

### Added
- **US-053**: Aggiunto il capitolo `PresenzeCalendarioChapter.tsx` (registro presenze con i tre stati per giocatore, tipologie evento e doppio orario ritrovo/inizio, link del feed iCal copiabile dal profilo). Registrato con `audience: 'both'`.
- **US-052**: Aggiunto il capitolo `PagamentiQuoteChapter.tsx` (elenco rate con stati, creazione piano rate multi-installment, spiegazione del debito pregresso trascinato tra stagioni, rimando al capitolo Reportistica per l'export). Registrato con `audience: 'staff'`.
- **US-051**: Aggiunto il capitolo `StagioniSportiveChapter.tsx` (selettore stagione in header, voce "Nuova stagione", i 4 step del wizard di nuova stagione con scatto di leva, spiegazione di cosa viene copiato/trascinato tra stagioni). Registrato con `audience: 'staff'`.
- **US-050**: Esteso il tipo `GuideChapter` con il campo `audience: 'staff' | 'portal' | 'both'` e modificato `Guide.tsx` per filtrare la lista capitoli in base alla variante, ricalcolando la numerazione dell'indice in modo dinamico.
- **US-050**: Aggiunto il capitolo `GestioneAtletiChapter.tsx` per la documentazione passo-passo della gestione atleti (ricerca, aggiunta, modifica e matricola FIGC) tramite layout illustrati (senza screenshot statici).
- **US-050**: Registrato il capitolo `gestione-atleti` limitandone la visibilità (audience: 'staff') al solo portale dirigenziale/allenatori, nascondendolo a giocatori e genitori.
- **US-049**: Aggiunta la voce "Guida" nel menu utente, sempre visibile a ogni ruolo, in entrambi i layout (`DashboardLayout.tsx` e `PortalLayout.tsx`), con navigazione alla nuova rotta `/guida` (Staff) o `/portal/guida` (Portale).
- **US-049**: Creata la pagina `Guide.tsx` (indice capitoli + capitolo attivo, senza reload) e il registro statico `guideChapters.tsx` con la mappa completa dell'epica EP-015 (un solo capitolo disponibile, gli altri "in arrivo").
- **US-049**: Creato il capitolo "Primi passi" (`PrimiPassiChapter.tsx`) con testo semplice per utenti non tecnici e un'illustrazione dell'header (`InterfacePreview`) con callout numerati, differenziata per variante staff/portale in base al ramo di routing.
- **US-034**: Creata la tabella `announcements` (bacheca societaria append-only, distinta dalle notifiche operative di `notificationService.ts`) con enum `announcement_severity` (urgent/reminder/communication) e RLS scoping per leva.
- **US-034**: Introdotte le funzioni SECURITY DEFINER `is_coach_of_sector(text)` e `get_my_announcement_sectors()`, quest'ultima riusata da `get_parent_player_ids()` per rispettare l'invariante `parent_players.status='confirmed'`.
- **US-034**: Creato `announcementService.ts` e la pagina staff `Notifiche.tsx` (storico + form di composizione con selettore leva scoping-aware, incluso il caso allenatore multi-leva) per president/director/coach.
- **US-034**: Creata la pagina pubblica `PortalNotifiche.tsx` (feed sola lettura color-coded per gravità, con filtro) e la relativa card di accesso in `PortalDashboard.tsx`.
- **US-034**: Estratta la configurazione di gravità condivisa in `src/lib/announcementSeverity.ts` (label/icona/colore), riusata da entrambe le pagine.
- **US-034**: Creato lo script di test di integrazione `test-announcements-rls.mjs` che valida lo scoping RLS insert/select per coach/president/player/parent, incluso l'invariante `parent_players.status='confirmed'`.
- **US-033**: Estratto il componente condiviso `MedicalStatusIndicator.tsx` da `MedicalVisits.tsx` (refactor puramente estrattivo, nessun cambio di comportamento) per riusare la stessa logica di badge di stato medico nel nuovo pannello dell'allenatore.
- **US-033**: Aggiunto `getSquadRoster(seasonId, sector?)` a `medicalService.ts`: query non paginata su `players` (anagrafica essenziale + `medical_expiry`) filtrata per stagione/attivi, riusando le RLS già esistenti (`players_select_coach`) senza alcuna nuova migrazione.
- **US-033**: Creata la pagina `SquadraAtleti.tsx` — pannello di sola lettura per l'allenatore con anagrafica e stato visite mediche dei soli atleti della propria squadra, chip di selezione leva per i coach multi-leva, empty-state onesto se nessun atleto attivo. Nessun dato finanziario esposto (AC3).
- **US-033**: Aggiunta la rotta `/squadra` e la relativa voce di navigazione per i ruoli president/director/coach.
- **US-033**: Creato lo script di test di integrazione `test-squad-panel.mjs` che valida isolamento mono-leva/multi-leva, esclusione atleti inattivi, assenza di colonne `payments` nella query e caso coach senza atleti attivi.
- **US-030**: Creata la RPC SECURITY DEFINER `get_my_next_call_up()` per consentire al ruolo `player` di leggere le informazioni e lo stato della propria prossima partita in modo mirato e sicuro.
- **US-030**: Aggiunto il metodo `getMyNextCallUp` nel client-side `callUpService.ts` per recuperare i dettagli di convocazione della leva e allineata la rigenerazione automatica dei tipi in `src/types/database.ts`.
- **US-030**: Creato il componente `NextCallUpCard.tsx` per mostrare lo stato di convocazione del giocatore con 5 stati grafici fedeli ai mockup (convocato, non convocato, bozza/non pubblicata, nessuna partita, profilo non collegato).
- **US-030**: Integrato `NextCallUpCard` in `PortalDashboard.tsx` per gli utenti giocatori in cima al portale atleti.
- **US-030**: Creato lo script di test di integrazione database `test-player-next-callup.mjs` che valida la RPC e le sue regole di sicurezza cross-leva e di pubblicazione.
- **US-032**: Aggiunte le colonne `opponent`, `team_sector` e `call_up_published_at` a `events` e creata la tabella `call_ups` (presenza riga = atleta convocato) con RLS separate per comando: lettura libera per l'allenatore, scrittura vincolata sia per leva (`is_coach_of_player`) sia per orario di ritrovo (`meetup_time > now()`), nessuna restrizione per president/director.
- **US-032**: Introdotta la funzione SECURITY DEFINER `is_call_up_published()` per verificare lo stato di pubblicazione della convocazione senza richiedere al ruolo `player` una policy SELECT su `events`.
- **US-032**: Creato `callUpService.ts` (`getUpcomingMatchEvents`, `getCallUpsForEvent`, `toggleCallUp`, `publishCallUps`, `unpublishCallUps`) e la nuova pagina `Convocazioni.tsx` per l'allenatore, con stati bozza/pubblicata/bloccata, contatori e toggle ottimistico in stile `Attendance.tsx`.
- **US-032**: Esteso il modale evento (`EventModal.tsx`) con i campi avversario e leva per le partite, con selettore leva vincolato alle leve realmente attive (`athleteService.getUniqueSectors`), non testo libero.
- **US-032**: Creato lo script di test di integrazione `test-call-ups.mjs` che valida isolamento per leva, blocco post-ritrovo, visibilità del giocatore solo dopo pubblicazione (e dopo ritiro pubblicazione) e accesso libero per president/director.
- **US-028**: Implementata la visualizzazione in sola lettura del bilancio pagamenti e dello stato visite mediche per i figli confermati dei genitori.
- **US-028**: Creato il componente `ChildBillingCard.tsx` per mostrare quota stagionale, rate saldate, rate residue, debito pregresso carried_over e lo stato del certificato medico (valido, in scadenza, scaduto, mancante).
- **US-028**: Realizzato il custom hook di composizione dati `useParentBillingData.ts` per caricare in parallelo stagione attiva, scadenze mediche in batch e pagamenti di ogni figlio.
- **US-028**: Integrato il bilancio dei figli in `PortalDashboard.tsx` per gli utenti genitori, gestendo anche lo stato di caricamento e gli errori di recupero dati.
- **US-028**: Creato lo script di test di integrazione database `test-parent-billing.mjs` che valida il recupero dati e l'isolamento RLS da figli pending o altrui.
- **US-027**: Introdotto lo stato `pending`/`confirmed` sulle associazioni genitore-figlio con una nuova colonna `status` e l'enum `parent_link_status`.
- **US-027**: Implementata la policy RLS `parent_players_insert_self_request` per consentire ai genitori di collegare figli in modalità `pending` in autonomia.
- **US-027**: Create le RPC SECURITY DEFINER `search_players_for_parent_request` per la ricerca protetta di atleti e `get_my_parent_players` per visualizzare le proprie richieste (pending e confirmed).
- **US-027**: Aggiunta la sezione "I miei figli" nella `PortalDashboard.tsx` per i genitori, con il nuovo modale di richiesta `RequestChildLinkModal.tsx`.
- **US-027**: Aggiunta la tab "Associazioni Genitore-Figlio" in `SettingsModal.tsx` per gli amministratori, che consente di approvare/rifiutare le richieste pendenti e creare associazioni dirette.
- **US-027**: Creato lo script di test di integrazione database `test-parent-children.mjs` che valida l'RLS di isolamento, le RPC e il ciclo di vita del collegamento.
- **US-035**: Introdotto un sistema di toast/notifiche centralizzato (`ToastContext`/`useToast`) in stile Premium Glass, montato globalmente in `App.tsx`.
- **US-035**: Creato un `ErrorBoundary` globale montato in `main.tsx` con schermata di fallback e pulsante "Ricarica pagina" per intercettare errori di rendering non gestiti.
- **US-035**: Creato il componente condiviso `QueryErrorState` per mostrare un messaggio d'errore con retry al posto di un'interfaccia vuota quando una `useQuery` fallisce; integrato in `Athletes`, `Payments`, `MedicalVisits`, `Inventory`, `StaffTasks`, `Attendance` e `Dashboard`.
- **US-035**: Creata l'utility `getErrorMessage` in `src/lib/errors.ts` per estrarre un messaggio leggibile dagli errori Supabase/RPC con fallback italiano generico.
- **US-036**: Creato l'hook `useFormModal` (`src/hooks/useFormModal.ts`) che centralizza il pattern loading/try-catch/finally/invalidateQueries/onClose nei modali con singola azione di submit.

### Fixed
- **US-041**: Introdotto il token `--brand-accent` in `src/index.css` per l'uso "colore di marchio" (icone, badge, link, focus, testo evidenziato) e migrato ~45 file da `text-primary`/`border-primary`/`bg-primary/N`: `--primary` in dark mode è quasi bianco (pensato solo per lo sfondo dei bottoni, abbinato a `--primary-foreground`), quindi ogni uso come accento diventava invisibile/bianco in tema scuro. Corretti anche 2 `rgba(var(--primary),...)` CSS non validi (`CalendarModal.tsx`, `TaskTimeline.tsx`).
- **US-041**: Rinforzati i token `--border-soft`, `--border-strong` (che in tema chiaro usava erroneamente un valore bianco pensato solo per lo scuro, risultando quasi invisibile), `--surface-05` e il colore di `.field-input::placeholder`/`.section-hint`/`.field-hint` (reso theme-aware, prima usava sempre la tonalità tarata per il tema scuro anche in chiaro).
- **US-041**: Sostituiti `bg-white text-gray-900` fissi negli input di `LoginPage.tsx`, `RegisterPage.tsx`, `RecoveryPage.tsx` (introdotti in US-039 come fix temporaneo) con i token `bg-input`/`text-foreground`, che si adattano correttamente a entrambi i temi; migrati anche i relativi bottoni submit al pattern shadcn corretto `bg-primary text-primary-foreground`.
- **US-041**: Corretti `NewSeasonWizardModal.tsx`, `ProfileModal.tsx`, `CalendarModal.tsx`, i componenti `tasks/` (Kanban/Lista/Timeline), `StaffTasks.tsx` e il modale condiviso `src/components/ui/modal.tsx`: costruiti assumendo un solo tema, con bordi/sfondi `white/N` privi di variante per il tema opposto (invisibili in tema chiaro).
- **US-041**: Sostituiti i colori hardcoded del tooltip di `FinancialTrendChart.tsx` e del gauge radiale di `SendEmailModal.tsx` con i token `--sidebar-foreground`/`--rose`/`--gold`/`--emerald`; rimossi diversi `#800020` residui (`NextCallUpCard.tsx`, `PlaceholderPage.tsx`, `PortalDashboard.tsx`) a favore di `--brand-accent`.
- **US-040**: Corretto il drag & drop della board Kanban (`KanbanBoard.tsx`), non funzionante da sempre: la card è un `motion.div` di framer-motion, che intercetta le prop `onDragStart`/`onDragEnd` come proprio sistema di gesture e non le inoltra mai al DOM nativo, per cui gli handler non partivano mai (mascherato da un doppio cast `as unknown as React.DragEvent`). Sostituito con `onDragStartCapture` (che framer-motion non riconosce e lascia passare inalterato) e aggiunto `onDragEndCapture` per resettare lo stato di drag anche quando il trascinamento viene annullato, non solo su drop riuscito.
- Corretto il testo invisibile negli input di `LoginPage`, `RegisterPage` e `RecoveryPage` in dark mode: il colore ereditava `text-foreground` (quasi bianco in dark mode) su uno sfondo `bg-white` intenzionalmente sempre chiaro; ora `text-gray-900` fisso, indipendente dal tema. Rilevato durante la verifica visiva di US-039.
- **US-047**: Corretto il loop di refetch del profilo utente in `AuthContext.tsx`: l'effect chiamava sia `getSession()` sia `onAuthStateChange`, e quest'ultimo richiamava `fetchProfile` incondizionatamente ad ogni evento (incluso l'`INITIAL_SESSION` sintetico e ogni `TOKEN_REFRESHED`), generando centinaia di `GET .../profiles` ravvicinate e l'errore React "Maximum update depth exceeded". Ora un solo punto di fetch (evento `INITIAL_SESSION`), guardia `useRef` sull'ultimo user id già fetchato, fetch deferita con `setTimeout(0)` fuori dal callback sincrono del listener (raccomandazione Supabase) e reset della guardia al logout. Aggiunto anche uno scarto esplicito delle risposte superate (race tra un fetch in volo e un logout/cambio utente più recente) emerso in code review.
- **US-048**: Corretto `inventoryService.ts`, che interrogava la tabella inesistente `inventory` invece di `inventory_items` in `getInventory`/`addItem`/`updateQuantity`, facendo fallire sistematicamente ogni operazione sulla pagina Magazzino. Lo schema di `inventory_items` è stato allineato alle colonne già presunte dal frontend (`unit`, `min_stock`, rename `updated_at`→`last_update`, `category` da enum a 4 valori a testo libero). Aggiunto lo stepper +/- sulla quantità in `Inventory.tsx`, emerso in code review come mancante: il bottone azioni della riga era puramente decorativo e senza di esso l'AC "modifica quantità" non era verificabile dalla pagina. Creato lo script di integrazione `test-inventory.mjs`, che colma l'assenza totale di copertura automatica su questa tabella.

### Refactored
- **US-041**: Creato il componente condiviso `Badge` (`src/components/ui/Badge.tsx`, prop `tone`/`icon`) che sostituisce le duplicazioni del pattern badge neutro (`bg-white/5 border-white/10 text-muted-foreground`) in `MedicalStatusIndicator`, `ChildBillingCard`, `ProfileModal`, `TaskListView`, `Convocazioni`, `Payments`, `Inventory`, `MedicalVisits`.
- **US-039**: Creato il componente condiviso `LoadingSpinner` (`src/components/ui/LoadingSpinner.tsx`, prop `size`/`tone`/`fullPage`/`label`) che sostituisce le ~29 implementazioni sparse di `Loader2 animate-spin` e dei div a bordo colorato in 11 modali, `ProtectedRoute`, `RoleGuard`, `RecoveryPage`, `LoginPage`, `RegisterPage`, `PortalDashboard`, `DashboardLayout` e `Notifiche`. Il colore di default passa da `#800020` hardcoded a `text-primary` (coerente col tema anche in dark mode), effetto voluto della consolidazione.
- **US-039**: Creato il componente condiviso `StatsGrid` (`src/components/ui/StatsGrid.tsx`, `variant: 'grid' | 'badge'`, prop `items`/`cardClassName`/`iconShape`) che sostituisce le card statistiche duplicate di `Payments.tsx`, `Inventory.tsx`, il componente locale `StatBadge` di `MedicalVisits.tsx` e (estensione concordata) `AthleteStatsCards.tsx`, preservando `onClick`/`hint` e lo stile bordo/icona circolare originale di quest'ultima tramite le nuove prop.
- **US-039**: `RoleGuard` mostra ora `<LoadingSpinner fullPage />` durante il caricamento del ruolo invece di ritornare `null` (schermo bianco).
- **US-039**: Rimosso il metodo duplicato `deletePlayer` da `athleteService.ts` (nessun chiamante nel repo), mantenuto `deleteAthlete` invariato.
- **US-038**: Introdotto `src/types/filters.ts` con i tipi condivisi `AthletesFilters` (consolidando 3 definizioni duplicate inline in `athleteService.ts`) e `PaymentsFilters` (nuovo, sostituisce i parametri posizionali `status`/`sortBy`/`sortDir` in `paymentService.getPayments`/`getPaymentsForExport`/`buildPaymentsQuery`). Rimossi i 4 cast `(p: any)` residui in `paymentService.ts`, tipizzando le callback `.map()` come `PaymentReference` (o varianti più precise per `getPaymentsByPlayer`/`getOverduePayments`, che non selezionano tutte le colonne del tipo). Refactor puramente di tipizzazione: nessuna modifica di comportamento, verificato con `tsc --noEmit`, l'intera suite di test di integrazione e un controllo manuale contro dati locali (filtri, ordinamento, export su Atleti e Pagamenti).
- **US-037**: Scomposta `Athletes.tsx` (1011 righe) in una feature folder `src/pages/Athletes/` — `index.tsx` come guscio di orchestrazione, hook `useAthletesData` per query e stato filtri, e componenti puri `AthleteFilterPanel`, `AthleteGridView`, `AthleteTableView`, `AthleteBanners`, `AthleteStatsCards`, `AthleteToolbar` (i tre ultimi estratti in aggiunta al piano per rientrare nel vincolo di ~300 righe per file). Refactor puramente estrattivo: nessuna modifica di comportamento, verificato manualmente contro dati locali (banner, filtri, ordinamento, viste griglia/tabella, export, modali).
- **US-036**: Migrati 5 modali all'hook `useFormModal` eliminando la duplicazione del pattern submit: `AddAthleteModal` (rimosso anche il banner `submitError` inline + `console.error`, sostituiti con toast), `AddInventoryModal`, `NewPaymentModal`, `PaymentModal`, `MedicalVisitModal`. I 9 modali con forme diverse (`EventModal`, `TaskModal`, `DeleteAthleteModal`, `ProfileModal`, `NewSeasonWizardModal`, ecc.) sono documentati come fuori scope con motivazione esplicita nell'hook stesso.


- **US-035**: Sostituiti i 6 punti in cui gli errori delle mutazioni nei modali venivano inghiottiti con solo `console.error` (`NewPaymentModal`, `PaymentModal`, `MedicalVisitModal`, `AddInventoryModal`, 2 punti in `ProfileModal`) con `toast.error(getErrorMessage(err))`, senza chiudere il modale e perdere i dati inseriti.
- **US-035**: Unificato il toast di successo del salvataggio profilo (`ProfileModal`) al nuovo sistema centralizzato, rimuovendo il pattern locale `.save-toast` non più utilizzato altrove.
- **US-035**: Corretta la RPC `get_dashboard_stats`, che aveva due overload conflittuali (uno senza parametri dal baseline schema, uno con `p_season_id` da US-007) che PostgREST non riusciva a disambiguare, causando errori 300/400 su ogni chiamata inghiottiti silenziosamente da `Dashboard.tsx` con zeri finti. Rimosso l'overload con parametro, che referenziava anche una colonna inesistente (`amount` invece di `amount_eur`) e ritornava uno shape JSON incompatibile col frontend; la season-awareness andrà reintrodotta correttamente in una story dedicata.
- **US-022**: Creata la RPC `get_financial_trend` per calcolare l'andamento finanziario mensile della stagione attiva (incassato quota, incassato insoluti pregressi, previsto totale, insoluti recuperati e rate future residue).
- **US-022**: Aggiunta la funzione `getFinancialTrend` in `paymentService.ts` per recuperare ed esporre i dati tipizzati nel frontend.
- **US-022**: Creato il componente `FinancialTrendChart.tsx` utilizzando Recharts per mostrare il grafico "Incassato vs Previsto" con barre impilate per quota/insoluti e linea "Oggi".
- **US-022**: Integrata la dashboard finanziaria in `Payments.tsx` (4 StatCard e il grafico) visibile solo agli amministratori (Presidente/Direttore Sportivo) con caricamento reattivo al cambio stagione.
- **US-022**: Creato lo script di test di integrazione `test-financial-trend.mjs` per validare l'aggregazione corretta delle rate pagate, insoluti carried_over, rate future residue e controlli RLS.
- **US-021**: Creata l'utility condivisa `xlsxExport.ts` per centralizzare la logica di generazione e download di fogli di calcolo `.xlsx` tramite la libreria SheetJS.
- **US-021**: Implementati i metodi `getPlayersForExport` in `athleteService.ts` e `getPaymentsForExport` in `paymentService.ts` per recuperare tutti i dati corrispondenti ai filtri attivi (senza paginazione lato server).
- **US-021**: Aggiunto il pulsante "Esporta Excel" nella toolbar di `Athletes.tsx` per scaricare l'anagrafica completa degli atleti (con codice fiscale, residenza, contatti dei genitori) mappata in lingua italiana.
- **US-021**: Aggiunto il pulsante "Esporta Excel" nella toolbar di `Payments.tsx`, visibile e utilizzabile solo per i ruoli `president` e `director` (gating tramite `useAuth`), per esportare la tabella finanziaria con filtri e ordinamento applicati.
- **US-020**: Allineato il frontend `SettingsModal.tsx` al vincolo di cambio ruolo a livello database, rendendo il selettore interattivo solo per gli utenti con ruolo `president` (Presidente).
- **US-020**: Mostrato il badge di ruolo statico in `SettingsModal.tsx` per tutti gli utenti con ruoli diversi da `president` (es. Dirigente), inibendo modifiche non autorizzate in UI.
- **US-020**: Introdotto un tooltip informativo sulla riga del proprio profilo (`"Non puoi modificare il tuo stesso ruolo"`) per spiegare visivamente il blocco del self-lock.
- **US-020**: Aggiornato `handleRoleChange` per visualizzare in modo trasparente l'errore effettivo restituito dal trigger DB (`error.message`) in caso di fallimento della query.
- **US-017**: Riscritto `Attendance.tsx` per implementare un registro presenze completo e mobile-first, comprensivo di selettore date, indicatori progressivi di stato e contatori di riepilogo.
- **US-017**: Creata la migrazione SQL per l'enum `attendance_status` ('present', 'absent', 'justified') e la colonna `status` associata, con backfill sicuro e vincolo di unicità `(player_id, session_date, type)`.
- **US-017**: Creato `attendanceService.ts` per gestire il caricamento della rosa di atleti attivi, il recupero dello stato presenze storico per data e l'upsert atomico con mutation ottimistica via React Query.
- **US-017**: Creato lo script di test di integrazione database `test-attendance.mjs` per validare l'RLS di coach, unicità, modificabilità ed isolamento delle stagioni.
- **Vercel Speed Insights**: Installato il pacchetto `@vercel/speed-insights` e integrato il componente `<SpeedInsights />` in `App.tsx` per il tracciamento delle metriche di performance.
- **US-016**: Aggiunto supporto al trascinamento degli insoluti della stagione precedente come "debito pregresso" all'avvio della nuova stagione.
- **US-016**: Estesa la RPC `create_season_from_wizard` per collegare gli atleti importati tramite `previous_player_id` e calcolare/inserire automaticamente il debito pregresso (riga `payments` con `plan = 'carried_over'`) per gli atleti con rate `pending` residue.
- **US-016**: Corretta la RPC `create_payment_plan` per escludere le righe `carried_over` dalla sovrascrittura/cancellazione del piano, dal blocco delle modifiche se già pagate, e dalla numerazione `installment_no` (che riparte dopo il debito pregresso).
- **US-016**: Estesi gli script di test `test-rpc-wizard.mjs` e `test-payment-plan.mjs` per validare l'integrazione e la coesistenza del debito pregresso.
- **US-016**: Aggiornati i tipi TS in `src/types/database.ts` e `paymentService.ts` per includere `previous_player_id` e il valore `'carried_over'` per `PaymentPlan`.
- **US-016**: Aggiunta la card statistica "Debito Pregresso" in `PlayerPaymentSummaryModal.tsx` ed etichetta dedicata sia in `PlayerPaymentSummaryModal` che in `Payments.tsx`.
- **US-015**: Aggiunto supporto completo ai pagamenti rateizzati multi-rata personalizzabili, consentendo all'amministrazione di definire importi e scadenze arbitrarie.
- **US-015**: Creata la RPC database `create_payment_plan` in transazione atomica per salvare o sovrascrivere un piano rate per atleta+stagione, validando la somma ed evitando modifiche se esistono già rate pagate.
- **US-015**: Riscritto `NewPaymentModal.tsx` come editor dinamico per piani rate (stepper 1-12 rate, divisione equa automatica/manuale, e indicatore visivo di bilanciamento live della quota).
- **US-015**: Creato il nuovo componente `PlayerPaymentSummaryModal.tsx` per visualizzare il riepilogo finanziario dell'atleta (quota totale, pagato, residuo) e l'elenco rate evidenziando quelle scadute e non pagate.
- **US-015**: Integrato il trigger per il riepilogo pagamenti in `Athletes.tsx` (in vista griglia e tabella).
- **US-015**: Creato lo script di test di integrazione database `test-payment-plan.mjs` che valida l'autorizzazione, la somma e il blocco delle sovrascritture su rate già saldate.
- **US-014**: Aggiunto feed iCal (.ics) personale e revocabile per sincronizzare gli eventi societari e le partite su Google Calendar, Apple Calendar o Outlook.
- **US-014**: Creata la migrazione SQL per aggiungere `ics_token` alla tabella `profiles` e la funzione `regenerate_ics_token` in modalità SECURITY INVOKER per rigenerare/revocare in modo sicuro il token personale.
- **US-014**: Sviluppato un serializzatore iCal RFC 5545 puro in TypeScript (`_shared/ics.ts`) che gestisce il folding delle righe a 75 caratteri, l'escape dei caratteri e la formattazione dei dettagli partita (ritrovo + inizio gara).
- **US-014**: Creata l'Edge Function pubblica `ics-feed` che risolve il token via service role, recupera gli eventi e risponde con `text/calendar`, protetta da validazione del token UUID e con intestazioni CORS e Cache-Control per evitare memorizzazioni locali.
- **US-014**: Integrazione dell'UI nel `ProfileModal.tsx` con la sezione "Sincronizza Calendario" che consente l'attivazione della sincronizzazione, la copia rapida del link negli appunti, la rigenerazione immediata (revoca) e lo stato di caricamento.
- **US-014**: Creato lo script di test di integrazione end-to-end `test-ics-feed.mjs` che valida il ciclo di vita del token (generazione, invalidazione, 404 per token errati) e la conformità del feed iCal generato.
- **US-012**: Creato il modulo `src/lib/dateTime.ts` contenente le funzioni pure `combineLocalDateTime` e `splitLocalDateTime` per la gestione corretta dei datetime rispetto alla timezone locale del browser.
- **US-012**: Integrazione degli helper di datetime in `TaskModal.tsx` e `calendarService.ts` per allineare l'inserimento/visualizzazione dei compiti del calendario ed evitare disallineamenti di fuso orario (offset UTC).
- **US-012**: Parsing sicuro della data di scadenza delle visite mediche (`medical_expiry`) per scongiurare slittamenti di data dovuti al parsing UTC.
- **US-012**: Nuovi script di test d'integrazione `test-datetime-helpers.mjs` (verifica round-trip e orari limite) e `test-calendar-timezone.mjs` (round-trip database end-to-end).
- **US-011**: Nuovo filtro `registrationStatus` a livello di `athleteService.getPlayers` e tipo `FiltersState` in `Athletes.tsx` per filtrare gli atleti con matricola mancante.
- **US-011**: Nuovo metodo `athleteService.getMissingRegistrationCount` per conteggiare gli atleti attivi senza matricola.
- **US-011**: Banner condizionale "Matricola Mancante" in `Athletes.tsx` (stile amber, con applicazione del filtro al click).
- **US-011**: Script di test di integrazione `test-registration-missing.mjs` che valida il filtro e il conteggio con ripristino automatico.
- **US-010**: Visualizzazione del numero di matricola FIGC nella vista tabella e vista card della pagina `Athletes.tsx`.
- **US-009**: Trigger database PostgreSQL `validate_player_fields` e trigger `trg_validate_player_fields` BEFORE INSERT OR UPDATE per impedire il salvataggio di atleti con dati obbligatori incompleti o formati codice fiscale non validi.
- **US-009**: Script di test di integrazione del database `test-validation-trigger.mjs` che convalida i vincoli del trigger lato server.
- **US-009**: Validazione frontend reattiva nel modale `AddAthleteModal.tsx` con stato degli errori reattivo in italiano, validazione codice fiscale conforme al database e blocco del pulsante di salvataggio.
- **US-009**: Feedback visivo e UX in `AddAthleteModal.tsx` con bordi rossi per i campi non validi, messaggi d'errore localizzati in italiano, e pallini rossi pulsanti sui tab delle sezioni con errori.
- **US-008**: Funzione RPC database `create_season_from_wizard(p_name text, p_start_date date, p_end_date date, p_players jsonb)` per la creazione atomica della nuova stagione, lo switch di stato `is_active` e la copia selettiva/dedup degli atleti con scatto di leva e regole di copia specifiche.
- **US-008**: Utility pura `suggestLeva` in `src/lib/leva.ts` con mapping fasce d'età FIGC parametrizzato sull'anno di inizio stagione.
- **US-008**: Nuovo modale multi-step `NewSeasonWizardModal.tsx` con stepper e layout fedele ai mockup per gestire i 4 step (dati, selezione atleti, scatto di leva/creazione leve, riepilogo e conferma).
- **US-008**: Wrapper client-side `createSeasonFromWizard` in `seasonService.ts` e parametrizzazione `seasonId` su `getUniqueSectors` in `athleteService.ts`.
- **US-007**: Store globale `useAppStore` (Zustand) con persistenza per gestire `seasons`, `theme` e `auth` (in sola lettura).
- **US-007**: Nuovo servizio `seasonService.ts` per recuperare le stagioni dal database e individuare quella attiva.
- **US-007**: Aggiunto parametro opzionale `seasonId` alle funzioni `getPlayers` e `getPayments` nei rispettivi servizi.

### Interfaccia
- **US-008**: Modificato il dropdown stagioni in `DashboardLayout.tsx` per consentire l'apertura anche con una sola stagione per i ruoli admin e aggiunto il pulsante "+ Nuova stagione" nel footer del menu per avviare il wizard.
- **US-007**: Refactoring del dropdown stagioni in `DashboardLayout.tsx` per rimuovere l'array hardcoded, integrarlo con lo store Zustand e il db.
- **US-007**: Aggiornate `Dashboard.tsx`, `Athletes.tsx` e `Payments.tsx` per ascoltare i cambiamenti di stagione nello store e aggiornare le query di React Query.

### Modificato
- **US-007**: Migrato `AuthProvider` per sincronizzare il profilo utente con `useAppStore`.
- **US-007**: Migrazione SQL per la funzione `get_dashboard_stats`: aggiunto parametro `p_season_id` con fallback automatico sulla stagione attiva.

## [0.13.0] - 2026-07-06

### Added
- **US-006**: Aggiunte Supabase Edge Functions per invio email (`send-email` e `medical-reminders`).
- **US-006**: Template grafico brandizzato (bordeaux/oro) per email e promemoria visite mediche (`_shared/templates.ts`).
- **US-006**: Documentazione architettura in `docs/edge-functions.md` per l'invio email e il setup segreti.

### Interfaccia
- **Modali allineati allo stile Premium Glass (US-005)**: overlay canonico `bg-background/60 backdrop-blur-xl` e pulsante di chiusura pill uniforme su tutti gli 11 modali; scala dei raggi normalizzata.
- **ProfileModal reale**: sostituito il placeholder con il modale "Il Mio Profilo" (avatar/iniziali, nome, email, badge ruolo, data registrazione) in sola lettura, fedele al mockup approvato; pulsante "Modifica Profilo" disabilitato (editing in US-018).
- **Responsive**: aggiunti vincoli viewport e scroll interno a `DeleteAthleteModal`, `NewPaymentModal`, `PaymentModal`.
- **Fix typo**: corretta la classe inesistente `NOT-italic` -> `not-italic` in 5 file (CalendarModal, TaskModal, MedicalVisitModal, AddInventoryModal, Athletes, Inventory, StaffTasks, TaskTimeline).

## [0.12.2] - 2026-07-05

### Qualità
- **Zero warning linter e TypeScript (US-004)**: risolti tutti i 26 problemi ESLint (14 `any` espliciti sostituiti con tipi reali, variabili inutilizzate, dipendenze `useMemo`/`useEffect`, regole `react-refresh` e `react-hooks/set-state-in-effect`), senza alcuna soppressione.
- **Refactoring auth**: hook `useAuth` estratto in `src/hooks/useAuth.ts` e context in `src/contexts/auth-context.ts` (Fast Refresh conforme); `buttonVariants` estratto in `button-variants.ts`.
- **SettingsModal**: caricamento utenti migrato a TanStack Query con update ottimistici via cache (`setQueryData`).
- **CalendarEvent**: tipo ridefinito come unione discriminata (`task`/`medical`) con `originalData` tipizzato.

## [0.12.1] - 2026-07-05

### Prestazioni
- **Indici database (US-003)**: aggiunti `idx_players_is_active` e `idx_players_medical_expiry` per i filtri delle liste atleti (`idx_payments_status` era già presente dalla baseline). Verificato con `EXPLAIN (ANALYZE)` sul cloud; matrice RLS rieseguita come non-regressione (23/23).

## [0.12.0] - 2026-07-05

### Sicurezza
- **RLS per tutti i ruoli (US-002)**: chiuse tre falle della baseline — escalation di privilegio su `profiles.role` (chiunque poteva auto-promuoversi via API), policy coach senza filtro squadra (vedeva tutti gli atleti e tutti i pagamenti), ruolo parent privo di policy.
- **Anti-escalation**: trigger `trg_enforce_role_change` — solo il Presidente può modificare i ruoli utente.
- **Nuove associazioni**: tabelle `coach_teams` (leve per allenatore) e `parent_players` (figli per genitore) con RLS dedicate.
- **Matrice di accesso verificata**: nuovo script `scripts/test-rls.mjs` (20 controlli sui 5 ruoli + anonimo, con utenti di prova e cleanup automatico).

## [0.11.0] - 2026-07-04

### Aggiunto
- **Supabase CLI e Migrazioni Versionate (US-001)**: la CLI è ora una devDependency con script npm dedicati (`db:new`, `db:pull`, `db:push`, `db:diff`, `db:list`); lo schema del database è versionato in `supabase/migrations/`.
- **Migrazione Baseline**: `20260704154518_baseline_schema.sql` fotografa l'intero schema di produzione (9 tabelle, funzioni incluse `get_dashboard_stats`, 27 policy RLS), incluso il trigger `on_auth_user_created` su `auth.users` non coperto dal dump automatico.
- **Documentazione Database**: nuova guida `docs/database.md` con setup al primo clone, flusso delle migrazioni e nota sul session pooler IPv4.

### Modificato
- **Archiviazione script manuali**: `supabase/migrations/payments_update.sql` spostato in `scripts/sql-archive/` (già applicato al cloud, catturato dalla baseline).
- **Migration history remota**: riparate 14 voci orfane del setup iniziale (marzo-aprile 2026) marcandole come `reverted`; la history riparte dalla baseline.
- `.gitignore` aggiornato con gli artefatti locali della CLI (`supabase/.temp/`).

## [0.10.0] - 2026-04-10

### Aggiunto
- **Supporto Orario**: Introdotta la possibilità di specificare l'ora di inizio e fine per ogni task (formato 24h).
- **Multi-day Tasks**: Il calendario ora visualizza correttamente i task che si sviluppano su più giorni.
- **Visualizzazione Calendario**: Gli orari dei task sono ora visibili direttamente nel titolo dell'evento nel calendario.

### Modificato
- **Flessibilità Task**: La data di fine è ora opzionale; i task vengono creati per un singolo giorno di default.
- **UI Professionale**: Sostituito l'alert di sistema con un modale professionale (`MedicalVisitModal`) per la gestione delle visite mediche direttamente dal calendario.

### Corretto
- **Migrazione Database**: Convertite le colonne delle date in `timestamptz` per supportare correttamente l'orario e risolvere l'errore di salvataggio.
- **Sincronizzazione Timezone**: Risolto il problema dello slittamento dei task (offset) tra mesi e giorni diversi nel calendario.

## [0.9.0] - 2026-04-10

### Aggiunto
- **Configurazione Vercel**: Creato `vercel.json` per gestire il client-side routing (rewrites) e prevenire errori 404 al ricaricamento della pagina.
- **Sistema di Notifiche Stateless**: Implementato calcolo real-time di avvisi per visite mediche in scadenza e task scaduti.
- **Badge Notifiche**: Aggiornato il layout con campanella dinamica e dropdown interattivo.

### Corretto
- **Robustezza Supabase**: Aggiunto controllo esplicito sulle variabili d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` con logging di errore dettagliato.
- **Sincronizzazione Contatori**: Fix invalidazione cache dopo l'aggiornamento di una visita medica; ora i badge delle statistiche e le notifiche si aggiornano istantaneamente.
- **Pulsante Filtri Mobile**: Garantita la visibilità del pulsante filtri su schermi ridotti in `AthletesPage`.

## [0.8.1] - 2026-04-10

## [0.8.0] - 2026-04-05

### Aggiunto
- **Campo Tesseramento FIGC** (`is_registered`): Nuova colonna `boolean` nella tabella `players` per tracciare se un atleta è tesserato federalmente. Distingue il tesseramento dallo stato "In Rosa" (attivo in squadra).
- **Toggle Tesserato nel Modale Atleta**: Card interattiva con toggle nella sezione "Sport" del modale `AddAthleteModal`. Verde = Tesserato FIGC, Ambra = Non Tesserato. Visibile in fase di iscrizione e modifica.
- **Filtri Avanzati Atleti**: Pannello filtri espandibile nella sezione Atleti con 4 dimensioni di filtraggio:
  - *Stato Squadra*: Tutti / In Rosa / Ritirati
  - *Tesseramento FIGC*: Tutti / Tesserati / Non Tesserati
  - *Visita Medica*: Tutte / Valida / Scaduta / Mancante
  - *Ordina Per*: Cognome A→Z / Ultimi Iscritti / Scadenza Medica (con toggle asc/desc)
- **Chip filtri attivi**: Mostrati sotto la toolbar con possibilità di rimozione singola.
- **Badge duplici sulle card atleta**: Ogni card mostra ora sia lo stato squadra ("In Rosa"/"Ritirato") che il tesseramento ("Tesserato"/"Non Tess.") con colori differenziati.
- **Colonna Tesserato in vista tabella**: Aggiunta colonna dedicata con badge colorato nella vista lista.
- **Stato vuoto intelligente**: Messaggio dedicato quando nessun atleta corrisponde ai filtri attivi, con pulsante "Azzera Filtri".
- **Allarme scadenza medica**: Nelle card atleta, le visite scadute appaiono evidenziate in rosso.
- **Ricerca estesa**: Ora la ricerca per nome/cognome include anche il codice fiscale.
- **Ordinamento server-side**: `athleteService.getPlayers` supporta ora parametri `sortBy` e `sortDir` con query Supabase.

### Modificato
- **Semantica `is_active`**: Rinominato da "Attivo/Inattivo" a **"In Rosa / Ritirato"** per maggiore chiarezza operativa. Un atleta "In Rosa" partecipa attivamente; "Ritirato" è fuori rosa ma conservato in archivio.
- **Statistiche header Atleti**: Aggiornate da 3 a 4 card:  Totale In Rosa · Tesserati FIGC · Settori · Visite Scadute.
- **Modali più grandi e accessibili**: Tutti i modali usano ora `w-[95vw]` con `max-h-[96vh]` per massimizzare la leggibilità su qualsiasi schermo. Header e padding aumentati (`p-8`, testo `text-2xl`).
- **Chiusura click-fuori**: Pannelli Notifiche, Impostazioni e Profilo ora si chiudono cliccando fuori dall'area.
- **Selettore Stagione nell'header**: Aggiunto menu a tendina per la selezione della stagione sportiva (UI placeholder, pronto per integrazione backend).
- **Icona Notifiche nell'header**: Aggiunta campanella con badge (UI placeholder, pronto per integrazione backend).
- **Logo header ingrandito**: Logo Pro Pontedecimo aumentato per maggiore visibilità (`w-12 h-12`).

### Corretto
- Rimosso import inutilizzato `Shield` da `SettingsModal.tsx`.
- Aggiunto `role="presentation"` e `onKeyDown` ai div backdrop del selettore stagione per conformità accessibilità.

## [0.7.0] - 2026-04-03

### Aggiunto
- **FilterToolbar Universale**: Nuovo componente `FilterToolbar` introdotto nelle sezioni Atleti e Visite Mediche con barra di ricerca a comparsa (animazione) e controlli scroll orizzontali.
- **Conteggi Visite Globali**: Ora le statistiche nella dashboard delle Visite Mediche sono calcolate tramite `medicalService.getMedicalStats` prendendo i dati reali a livello globale di società, indipendentemente dalla paginazione locale.

### Corretto
- Risolti bug legati all'aggiornamento dei ruoli in `SettingsModal` (implementata proper Supabase Policy per amministratori e aggiunto mapping per ruolo Parent).
- Risolto errore database `23502` durante l'inserimento di nuovi atleti (auto fetch di `season_id` se mancante).
- Aggiornato selector della leva con pre-fetch dinamico dal database (`getUniqueSectors`).
- Pulizia globale di warning TypeScript e organizzazione degli import in `Athletes.tsx` e `MedicalVisits.tsx`.

## [0.6.0] - 2026-03-27

### Aggiunto
- **Global Server-Side Pagination**: Implementata paginazione nativa Supabase in tutti i moduli (Atleti, Visite Mediche, Magazzino, Pagamenti).
- **Componente Reusable Pagination**: Creato `<Pagination />` con design glassmorphic e integrazione React Query.
- **Barre di Ricerca XL**: Ingrandite e rese più leggibili (`h-16`, `text-xl`) in tutte le pagine principali.
- **Refactoring Modali Premium**: Aggiornati `AddAthleteModal`, `AddInventoryModal` e `AddTaskModal` allo stile standard "Premium Glass".

### Modificato
- **UI Accessibility (Light Mode)**: Revisione completa di tutti i componenti per garantire perfetta visibilità in modalità chiara (rimozione hardcoded `text-white`).
- **Refactoring Service Layer**: Aggiornati tutti i servizi per restituire la struttura `{ data, count }`.
- **Query Keys**: Ottimizzate le chiavi di cache di React Query per includere `page`, `search` e `filters`.

### Corretto
- Risolti errori TypeScript e avvisi del linter (ternari annidati, array index keys).
- Corretti import mancanti (`supabase`) e named/default imports errati.
- Ottimizzata la gestione dei tipi TypeScript nel service layer.

## [0.5.1] - 2026-03-27

### Aggiunto
- **Integrazione Modale Atleti**: Collegato `AddAthleteModal` in `Athletes.tsx` con mapping completo dei campi DB.
- **Integrazione Modale Magazzino**: Collegato `AddInventoryModal` in `Inventory.tsx`.
- **UI/UX Enhanced**: Barra di ricerca ingrandita (h-16), font-size aumentato e contrasto migliorato per massima leggibilità.
- **Accessibilità**: Aggiunti attributi `id` e `htmlFor` a tutti i campi di input dei modali.

### Corretto
- Risolti errori di tipo in `Athletes.tsx` relativi a React Query e all'oggetto `Player`.
- Corretti import errati e typo (`hramer-motion` → `framer-motion`).
- Rimossi avvisi "Do not use Array index in keys" sostituiti con chiavi stabili basate sugli ID del database.
- Centralizzata la logica di fetching in `inventoryService.ts` (`getInventory`).

## [0.5.0] - 2026-03-27

### Aggiunto
- **Modulo Staff Tasks**: Interfaccia glassmorphic per la gestione delle attività societarie.
- **Service Layer Staff**: Integrazione con Supabase per CRUD task e gestione profili.
- **Modale AddTask**: Form per la creazione di nuove task con assegnazione automatica `created_by`.

### Corretto
- Risolti critici errori di sintassi in `Athletes.tsx` che impedivano la build.
- Corretta gestione degli import `useState` e hook di React mancanti.
- Sistemati i warning del linter "Do not use Array index in keys" in tutte le pagine principali.
- Ottimizzata la gestione dei tipi TypeScript nel service layer.
- Migliorata la consistenza grafica (stondature, trasparenze, effetti glass) su Atleti e Magazzino.

### Modificato
- Refactoring `AuthContext` per esporre correttamente l'ID utente per il tracciamento creazioni.
- Aggiornato `AI/agent.md` con nuove policy su branching (no-delete) e versionamento.
