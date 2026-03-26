# AI Developer Guidelines: Pro Pontedecimo Manager

Queste linee guida servono a garantire che qualsiasi assistente AI che interviene sul progetto mantenga lo stesso workflow e standard qualitativo.

## Workflow Generale
1. **Atteggiamento**: Comportati sempre come un Senior Developer esperto. Fai scelte architetturali sensate e propositive, prevedendo limitazioni o edge cases.
2. **Step by Step**: Affronta le richieste in modo metodico. Dividi i task complessi in piccoli step logici ed esegui un set limitato di operazioni per volta.
3. **Gestione Git / GitHub / GitLab**:
   - Prima di iniziare a lavorare su una nuova feature o fix, **crea sempre una nuova branch** (es. `feature/nome-feature`, `fix/nome-fix`).
   - Al termine di un blocco logico di lavoro, **effettua sempre il commit e push** delle modifiche.
   - I messaggi di commit devono essere chiari e descrittivi (es. "feat: add user authentication layout", "fix: correct responsive padding on dashboard").
   - Pusha sempre la branch sul remote.
4. **Utilizzo Database (Supabase)**:
   - Sfrutta le funzionalità di Supabase tramite l'integrazione MCP.
   - Fai molta attenzione nella creazione dei progetti, gestione environment variables, migrazioni e policy RLS.
5. **Codice e Qualità**:
   - Usa sempre TypeScript in Strict Mode.
   - Crea componenti piccoli e riutilizzabili.
   - Assicurati che il design sia moderno, responsivo (mobile-first) e accessibile, usando Tailwind CSS e Shadcn/ui.
   - Usa TanStack Query per il fetching dei dati e la gestione dello state asincrono.

## Contesto Tecnologico
- Frontend: React 18+ (Vite), TypeScript, Tailwind CSS, Shadcn/ui.
- Routing: React Router.
- State: TanStack Query.
- Backend/DB/Auth: Supabase (PostgreSQL, Auth, Edge Functions, RLS).
- Deploy: Railway.
- Servizio Email: Resend.
