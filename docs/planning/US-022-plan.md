# US-022: Grafici andamento finanziario — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-12

---

## User Story

**Epic:** EP-008 — Reportistica & Esportazione
**Priorità:** MEDIUM | **Story Points:** 3

**Story**
Come Presidente,
voglio grafici sull'andamento dell'incassato (incluso recupero insoluti e rate future) rispetto al previsto,
così che la situazione economica della società sia leggibile a colpo d'occhio.

**Criteri di Accettazione**
- [ ] Un grafico Recharts mostra l'andamento dell'incassato rispetto al previsto per la stagione attiva
- [ ] Il recupero insoluti pregressi e le rate future sono rappresentati nel grafico (dipende da US-015 e US-016)
- [ ] Il grafico rispetta la stagione selezionata nell'header (US-007)
- [ ] I grafici sono visibili solo ai ruoli con accesso ai dati finanziari globali

---

## Soluzione Tecnica

Il vincolo reale non è il grafico in sé — Recharts è un problema risolto — ma il fatto che non esiste oggi alcuna aggregazione finanziaria affidabile su cui appoggiarsi: la RPC esistente `get_dashboard_stats(p_season_id)` referenzia una colonna `amount` che su `payments` non esiste (la colonna reale è `amount_eur`) e ha una forma di ritorno già disallineata dal suo unico consumer (`Dashboard.tsx`). Estenderla erediterebbe quel bug in una story che non lo ha causato — esattamente il tipo di accoppiamento non dichiarato che questo progetto vuole evitare sulle superfici condivise. La soluzione introduce quindi una nuova RPC dedicata, isolata da quel problema (segnalato a parte, fuori scope), e per il resto riusa pattern già consolidati: gate di ruolo `SECURITY DEFINER` come `create_payment_plan`, consumo di `selectedSeasonId` come tutte le query di `Payments.tsx`, stile `glass-card`/`StatCard` come `Dashboard.tsx`.

- **Nuova migrazione — RPC `get_financial_trend(p_season_id uuid)`**: `SECURITY DEFINER`, stesso gate di ruolo di `create_payment_plan` (`get_user_role()` non in `('president','director')` → `RAISE EXCEPTION ... ERRCODE '42501'`). Bucketizza tutte le righe `payments` della stagione per mese di `due_date` e ritorna un `jsonb` con `months[]` (per mese: `previsto_eur` = somma `amount_eur`; `incassato_quota_eur` = somma `paid_amount_eur` dove `status='paid' AND plan<>'carried_over'`; `incassato_insoluti_eur` = somma `paid_amount_eur` dove `status='paid' AND plan='carried_over'`) e `totals` (previsto totale, incassato totale, insoluti recuperati, rate future residue = somma `amount_eur - coalesce(paid_amount_eur,0)` dove `status<>'paid' AND due_date >= current_date`). Il divario tra barra "Previsto" e barra "Incassato" nei mesi futuri rappresenta le rate future senza bisogno di una serie dati dedicata.
- **`paymentService.ts`**: nuova funzione `getFinancialTrend(seasonId)` che chiama `supabase.rpc('get_financial_trend', { p_season_id: seasonId })` — stesso file dei servizi pagamenti esistenti, nessun nuovo modulo per un'unica funzione.
- **Nuovo componente `src/components/charts/FinancialTrendChart.tsx`**: `BarChart` Recharts con una `Bar` "Previsto" e due `Bar` impilate (`stackId="incassato"`) per "Quota" e "Insoluti Recuperati", colori dai token esistenti (`--emerald` per quota incassata, `--gold` per insoluti recuperati, `--primary-soft` per previsto). 4 `StatCard` sopra il grafico (Incassato Totale, Previsto Totale, Insoluti Recuperati, Rate Future Residue) — stesso pattern glass-card già in uso, nessun nuovo stile.
- **`Payments.tsx`**: nuova sezione `{isAdmin && <FinancialTrendChart seasonId={selectedSeasonId} />}` sopra la griglia statistiche esistente, con `useQuery(['financial-trend', selectedSeasonId], ..., { enabled: isAdmin && !!selectedSeasonId })` — stesso gate `isAdmin` già presente in pagina (non `RoleGuard`, che è solo a livello di rotta), stesso pattern di season-gating delle altre query della pagina.
- **Dipendenza `recharts`**: non presente in `package.json`, va aggiunta (`npm install recharts`) — primo punto di integrazione nel progetto, nessun precedente da riusare.
- **Alternativa scartata**: estendere `get_dashboard_stats(p_season_id)` invece di creare una nuova RPC. Scartata perché quella funzione ha un bug attivo non collegato a questa story e una forma di ritorno già disallineata dal suo consumer — mescolare la correzione di quel bug con questa story avrebbe violato la regola di non toccare una superficie condivisa senza prima capirne lo stato reale. Il bug è stato segnalato a parte per una sessione dedicata.

---

## Strategia di Test

Il rischio è tutto nell'aggregazione SQL (raggruppare correttamente per mese mantenendo `carried_over` distinto e includendo le rate non ancora scadute), non nel frontend, che compone pattern già visti in `Payments.tsx`.

- **Integrazione RPC** (`scripts/test-financial-trend.mjs`, nuovo — auto-rilevato da `npm run test:integration`): con una stagione di test contenente rate pagate, rate future non scadute e una riga `plan='carried_over'` (pagata e non pagata), verificare che `months[]` e `totals` aggregino correttamente e distinguano "quota" da "insoluti recuperati"; una stagione senza alcun pagamento ritorna un array vuoto/zeri senza errore.
- **Autorizzazione RPC**: un utente `coach` che chiama `get_financial_trend` riceve `42501`; `president`/`director` ricevono i dati corretti — stesso schema di test di `scripts/test-payment-plan.mjs`.
- **Regressione** (`npm run test:integration`, intera suite): `payments` è una superficie condivisa con US-002/US-003/US-015/US-016 — una nuova RPC di sola lettura non dovrebbe rompere nulla, ma va verificato.
- **Verifica manuale**: con Supabase locale, aprire `/pagamenti` come `president` — il grafico mostra i dati corretti per la stagione attiva, cambiare stagione dall'header aggiorna il grafico senza refresh manuale, una stagione senza pagamenti mostra uno stato vuoto pulito (non un grafico rotto). Login come `coach` — la sezione grafico non compare affatto nella pagina.
- **Type-check**: `npx tsc --noEmit` dopo le modifiche a `paymentService.ts`, `Payments.tsx` e il nuovo componente.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| DONE | TASK-01 | Migrazione RPC `get_financial_trend` | Nuova funzione `SECURITY DEFINER` con gate di ruolo `president`/`director`, aggregazione mensile di `payments` (previsto, incassato quota, incassato insoluti, rate future residue) per la stagione passata. | Impl | - |
| DONE | TASK-02 | Test integrazione RPC | Nuovo `scripts/test-financial-trend.mjs`: aggregazione corretta con rate pagate/future/carried_over, autorizzazione (`42501` per coach), stagione senza pagamenti. | Test | TASK-01 |
| DONE | TASK-03 | Aggiungere dipendenza `recharts` | `npm install recharts`. | Impl | - |
| DONE | TASK-04 | `paymentService.getFinancialTrend` | Nuova funzione che chiama la RPC e ritorna i dati tipizzati. | Impl | TASK-01 |
| DONE | TASK-05 | Componente `FinancialTrendChart` | Nuovo `src/components/charts/FinancialTrendChart.tsx`: `BarChart` Recharts con barra "Previsto" e barra impilata "Incassato" (Quota + Insoluti Recuperati), colori dai token esistenti. | Impl | TASK-03, TASK-04 |
| DONE | TASK-06 | Integrazione in `Payments.tsx` | Nuova sezione con 4 `StatCard` (Incassato Totale, Previsto Totale, Insoluti Recuperati, Rate Future Residue) + `FinancialTrendChart`, gated `isAdmin` e `selectedSeasonId`. | Impl | TASK-05 |
| DONE | TASK-07 | Verifica manuale end-to-end | Su Supabase locale: dati corretti per stagione attiva, cambio stagione da header aggiorna il grafico, stato vuoto pulito senza pagamenti, sezione assente per `coach`. | Test | TASK-06 |
| DONE | TASK-08 | Regressione e type-check | `npm run test:integration` (intera suite) + `npx tsc --noEmit`. | Test | TASK-02, TASK-06 |

---

> 🎨 I mockup per questa storia sono disponibili in `docs/mockups/US-022/`

_Piano generato via Archetipo Planning — 2026-07-12_
