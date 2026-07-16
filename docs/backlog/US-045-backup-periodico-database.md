# US-045: Backup periodico del database

**Epic:** EP-009 — Deploy VPS, Migrazione & Backup | **Priority:** MEDIUM | **Story Points:** 3 | **Scope:** Growth

**Story**
Come Presidente,
voglio che il database di produzione sia salvato periodicamente in locale e con copia crittografata su OneDrive societario,
così che i dati della società siano recuperabili anche in caso di guasto della VPS.

**Demonstrates**
After implementing this story, the user can: verificare la presenza del backup del giorno sulla VPS e della copia crittografata su OneDrive, e ripristinarlo con successo.

**Acceptance Criteria**
- [ ] Un cron-job esegue il `pg_dump` periodico del database di produzione (dipende da US-042)
- [ ] Una copia crittografata è inviata su OneDrive societario tramite rclone
- [ ] I backup più vecchi vengono ruotati secondo una retention definita
- [ ] Un ripristino di prova da backup è stato eseguito e documentato con successo

**Status:** TODO
**Plan:** —

