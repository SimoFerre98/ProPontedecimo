# US-039: Componenti condivisi e pulizie minori — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-22

---

## User Story

**Epic:** EP-014 — Refactoring Architetturale & Resilienza
**Priorità:** LOW | **Story Points:** 2

**Story**
Come sviluppatore del progetto, voglio componenti condivisi per spinner e card statistiche e la rimozione delle piccole duplicazioni note, così che l'interfaccia resti coerente e il codice non accumuli micro-debiti.

**Criteri di Accettazione**
- [ ] Un componente `LoadingSpinner` condiviso sostituisce le ~29 implementazioni ripetute di `animate-spin`/`Loader2`
- [ ] Un componente `StatsGrid` riutilizzabile sostituisce le card statistiche duplicate in Payments, Inventory e MedicalVisits (estensione decisa in fase di piano: anche in `AthleteStatsCards.tsx`, 4° duplicato equivalente trovato durante l'analisi)
- [ ] `RoleGuard` mostra lo spinner durante il loading invece di ritornare `null` (schermo bianco)
- [ ] Il metodo duplicato `deleteAthlete`/`deletePlayer` in `athleteService.ts` è consolidato in uno solo

---

## Soluzione Tecnica

Il progetto ha già una convenzione per componenti di sistema riutilizzabili in `src/components/ui/` (`FilterToolbar.tsx`, `query-error-state.tsx`, `Pagination.tsx`), senza una cartella `shared/` separata: i due nuovi componenti seguono questa stessa collocazione, mentre la pulizia di `athleteService.ts` è la rimozione di un metodo duplicato senza chiamanti.

- **`LoadingSpinner`** (`src/components/ui/LoadingSpinner.tsx`): componente unico basato su `Loader2` di lucide-react, con prop `size` (`sm`/`md`/`lg` → w-4/w-6/w-8, copre sia gli usi inline nei bottoni sia gli overlay/full-page), `tone` (`primary`/`white`/`muted`, per coprire sia i contesti su sfondo scuro/bordeaux — es. bottoni login/register — sia quelli su `glass-card`) e `fullPage` (booleano, con `label` testuale opzionale sotto, per riprodurre il pattern oggi in `ProtectedRoute`). Consolida sia la famiglia di usi con icona `Loader2` sia quella con `<div>` a bordo colorato (`border-t-transparent animate-spin`) oggi presente in `ProtectedRoute`, `RecoveryPage`, `LoginPage`, `RegisterPage`, `PortalDashboard`, `DashboardLayout`, `Notifiche`.
- Il colore di default si uniforma su `text-primary` invece dell'hex hardcoded `#800020` usato oggi in `ProtectedRoute`/`RecoveryPage`: in dark mode `--primary` non è bordeaux ma un grigio chiaro (`index.css:117`), quindi lo spinner full-page cambierà visivamente aspetto in dark mode (da bordeaux fisso a coerente col tema). È un effetto voluto della story (coerenza), non un side-effect nascosto.
- **Fuori perimetro esplicito:** `NextCallUpCard.tsx` (icona `Clock` con `animate-spin`, puramente decorativa) e `ProfileModal.tsx` (icona `RefreshCw` che ha significato anche a riposo, `animate-spin` solo condizionale) non vengono migrati a `LoadingSpinner`: non sono loader puri e sostituirli altererebbe la semantica visiva senza motivo.
- **`StatsGrid`** (`src/components/ui/StatsGrid.tsx`): prop `items: {label, value, icon, color, bg, onClick?, hint?}[]` e `variant: 'grid' | 'badge'`. La variante `grid` sostituisce le card compatte duplicate quasi identiche di `Payments.tsx` (sezione non-hero) e `Inventory.tsx`. La variante `badge` replica lo stile del componente locale `StatBadge` di `MedicalVisits.tsx`, che viene rimosso. La sezione hero di Payments (4 card admin-only con blur decorativo) resta invariata: è un layout unico, non duplicato altrove, e non rientra nell'obiettivo di dedup della story.
- **Estensione rispetto all'AC letterale:** durante l'analisi è emerso un 4° duplicato non citato esplicitamente nell'AC — `src/pages/Athletes/components/AthleteStatsCards.tsx` (pagina Atleti, introdotto da US-037) ha la stessa identica struttura card di Payments/Inventory, con in più `onClick` (navigazione al click) e `hint` (tooltip). Su decisione esplicita dell'utente, viene incluso in questa story: `items` supporta `onClick`/`hint` opzionali proprio per coprire questo caso, così `StatsGrid` sostituisce il pattern anche qui senza perdere funzionalità.
- **`RoleGuard.tsx`**: `if (loading) return null` diventa `if (loading) return <LoadingSpinner fullPage />`. Oggi è quasi sempre `ProtectedRoute` (che già mostra un proprio spinner) a intercettare il loading prima che `RoleGuard` monti i suoi children, ma il fix mette in sicurezza qualunque uso futuro di `RoleGuard` non annidato in `ProtectedRoute`, e soddisfa l'AC alla lettera.
- **`athleteService.ts`**: `deletePlayer` e `deleteAthlete` sono identici byte-per-byte (stessa tabella `players`, stessa query `delete().eq('id', id)`). `deletePlayer` non ha alcun call site nel repo; `deleteAthlete` ne ha uno solo (`DeleteAthleteModal.tsx:52`). Si rimuove `deletePlayer`, nessun impatto su comportamento o firma di `deleteAthlete`.

---

## Strategia di Test

Il progetto non ha infrastruttura di unit test per componenti React (nessun vitest/RTL in `package.json`: gli script `scripts/test-*.mjs` coprono solo l'integrazione backend/Supabase). Questa story è un refactor puramente frontend più la rimozione di un metodo di servizio senza chiamanti, senza alcun impatto su schema, RLS o RPC: la rete di sicurezza è quindi type-check + verifica visiva manuale + suite di integrazione esistente, non nuovi test automatici.

- **Type-check**: `npx tsc --noEmit` dopo ogni sostituzione, per intercettare riferimenti orfani a `deletePlayer` o prop mancanti nei nuovi componenti.
- **Verifica visiva manuale** (light + dark theme, dato che `--primary` cambia radicalmente tra i due temi): tutti i modali con submit/delete, `ProtectedRoute`/`RoleGuard` durante il loading, login/register/recovery, `Payments`, `Inventory`, `MedicalVisits`, header notifiche, `PortalDashboard`.
- **Regressione cross-story**: `npm run test:integration` (suite completa, non solo eventuali test toccati da questa story) prima di segnare US-039 `DONE`, per confermare che nessuno script referenzi `deletePlayer` e che nessun'altra story attiva su `players`/`payments` sia stata impattata.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Creare `LoadingSpinner` | Nuovo componente in `src/components/ui/LoadingSpinner.tsx` con prop `size`, `tone`, `fullPage`+`label` | Impl | - |
| DONE | TASK-02 | Creare `StatsGrid` | Nuovo componente in `src/components/ui/StatsGrid.tsx` con `variant: 'grid' \| 'badge'` e prop `items` | Impl | - |
| DONE | TASK-03 | Rimuovere `deletePlayer` da `athleteService.ts` | Elimina il metodo duplicato senza chiamanti, mantiene `deleteAthlete` invariato | Impl | - |
| DONE | TASK-04 | Migrare gli spinner inline nei modali | Sostituire `Loader2`/`animate-spin` con `<LoadingSpinner size="sm" />` in tutti gli 11 modali coinvolti (SettingsModal, AddAthleteModal, AddInventoryModal, DeleteAthleteModal, EventModal, MedicalVisitModal, NewPaymentModal, PaymentModal, PlayerPaymentSummaryModal, RequestChildLinkModal, SendEmailModal, TaskModal) e nei bottoni export di Payments/AthleteToolbar | Impl | TASK-01 |
| DONE | TASK-05 | Migrare gli spinner full-page/overlay | Sostituire i div a bordo colorato con `<LoadingSpinner fullPage />`/`<LoadingSpinner size="lg" />` in `ProtectedRoute`, `RecoveryPage`, `LoginPage`, `RegisterPage`, `PortalDashboard`, `DashboardLayout`, `Notifiche` | Impl | TASK-01 |
| DONE | TASK-06 | Aggiornare `RoleGuard` | Sostituire `return null` in loading con `<LoadingSpinner fullPage />` | Impl | TASK-01 |
| DONE | TASK-07 | Migrare le card statistiche di Payments e Inventory | Sostituire la sezione grid di `Payments.tsx` e le stat card di `Inventory.tsx` con `<StatsGrid variant="grid" items={...} />`, lasciando invariata la sezione hero admin-only di Payments | Impl | TASK-02 |
| DONE | TASK-08 | Migrare i badge statistiche di MedicalVisits | Sostituire il componente locale `StatBadge` di `MedicalVisits.tsx` con `<StatsGrid variant="badge" items={...} />` e rimuovere la funzione duplicata | Impl | TASK-02 |
| DONE | TASK-09 | Migrare le card statistiche di AthleteStatsCards | Sostituire il markup di `AthleteStatsCards.tsx` con `<StatsGrid variant="grid" items={...} />`, passando `onClick`/`hint` per preservare navigazione al click e tooltip | Impl | TASK-02 |
| DONE | TASK-10 | Type-check completo | `npx tsc --noEmit` per verificare che nessuna sostituzione o rimozione abbia lasciato riferimenti orfani | Test | TASK-03, TASK-04, TASK-05, TASK-06, TASK-07, TASK-08, TASK-09 |
| DONE | TASK-11 | Verifica visiva manuale | Verificato via browser preview su LoginPage/RegisterPage (spinner bianco size=sm su bottone bordeaux, light+dark) e RecoveryPage; Payments/Inventory/MedicalVisits/Athletes/modali NON verificabili in browser (dev server punta al progetto Supabase Cloud in `.env`, nessuna credenziale di test disponibile — nessun tentativo di login reale eseguito). Verifica di questi ultimi affidata a type-check + code review + lettura diff dei worker. Rilevato (fuori perimetro) un bug di contrasto pre-esistente su input Login/Register in dark mode, segnalato come task separato | Test | TASK-10 |
| DONE | TASK-12 | Suite di integrazione completa | `npx supabase db reset` + `npm run test:integration` per escludere regressioni cross-story dovute alla rimozione di `deletePlayer` — tutte le 19 suite superate | Test | TASK-03 |

---

_Piano generato via Archetipo Planning — 2026-07-22_
