# US-042: Setup Supabase self-hosted su VPS

**Epic:** EP-009 — Deploy VPS, Migrazione & Backup | **Priority:** MEDIUM | **Story Points:** 5 | **Scope:** Growth

> **Nota:** provider VPS confermato come Contabo (in sostituzione di Hetzner citato nell'epic originale).
>
> **⏸ ON HOLD (2026-07-16):** VPS non ancora disponibile/provisionata. In attesa, lo sviluppo applicativo continua normalmente su Supabase locale e sul progetto Supabase Cloud collegato a Vercel (già in uso), mantenendo entrambi sincronizzati sulle stesse migrazioni. Story rinumerata da US-023 a US-042 e riportata in fondo all'ordine di lavorazione di EP-009: nessuna delle story successive dell'epica (US-043, US-044, US-045) può partire prima che questa sia completata, quindi l'intera epica resta in pausa fino a disponibilità VPS.

**Story**
Come sviluppatore del progetto,
voglio installare e configurare lo stack Docker Compose di Supabase sulla VPS Contabo tramite Coolify,
così che la produzione giri su infrastruttura di proprietà, senza i limiti del piano Free cloud.

**Demonstrates**
After implementing this story, the user can: raggiungere lo studio Supabase self-hosted sulla VPS con autenticazione funzionante.

**Acceptance Criteria**
- [ ] Lo stack Supabase (PostgreSQL, Auth, API, Studio) è attivo sulla VPS via Docker Compose/Coolify
- [ ] I servizi sono raggiungibili via HTTPS con certificati validi
- [ ] Le credenziali e i segreti sono gestiti fuori dal repository
- [ ] Un riavvio della VPS ripristina automaticamente tutti i servizi

**Status:** PLANNED
**Plan:** [docs/planning/US-042-plan.md](../planning/US-042-plan.md)

