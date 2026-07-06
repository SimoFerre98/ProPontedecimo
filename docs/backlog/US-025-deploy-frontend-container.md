# US-025: Deploy del frontend in container

**Epic:** EP-009 — Deploy VPS, Migrazione & Backup | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** Growth

**Story**
Come sviluppatore del progetto,
voglio servire la SPA React da un container Nginx con SSL automatico gestito da Coolify,
così che il frontend di produzione sia deployabile in modo riproducibile sulla VPS.

**Demonstrates**
After implementing this story, the user can: aprire l'URL di produzione via HTTPS e usare l'applicazione collegata al Supabase self-hosted.

**Acceptance Criteria**
- [ ] Il Dockerfile builda la SPA e la serve tramite Nginx
- [ ] Il routing client-side di React Router funziona su refresh e deep-link (fallback a `index.html`)
- [ ] SSL è attivo e rinnovato automaticamente tramite Coolify
- [ ] Il frontend punta all'istanza Supabase della VPS tramite configurazione d'ambiente, non hardcoded

**Status:** TODO
**Plan:** —

