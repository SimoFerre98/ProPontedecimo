# US-042: Setup Supabase self-hosted su VPS — Piano di Implementazione

**Generato da:** Archetipo Planning Team
**Data:** 2026-07-14

---

## User Story

**Epic:** EP-009 — Deploy VPS, Migrazione & Backup
**Priorità:** MEDIUM | **Story Points:** 5

**Story**
Come sviluppatore del progetto, voglio installare e configurare lo stack Docker Compose di Supabase sulla VPS Contabo tramite Coolify, così che la produzione giri su infrastruttura di proprietà, senza i limiti del piano Free cloud.

**Criteri di Accettazione**
- [ ] Lo stack Supabase (PostgreSQL, Auth, API, Studio) è attivo sulla VPS via Docker Compose/Coolify
- [ ] I servizi sono raggiungibili via HTTPS con certificati validi
- [ ] Le credenziali e i segreti sono gestiti fuori dal repository
- [ ] Un riavvio della VPS ripristina automaticamente tutti i servizi

**Vincoli confermati con l'utente:**
- Provider: **Contabo** (non Hetzner, corretto in story/backlog)
- Taglio VPS: 4 vCPU / 8GB RAM
- Dominio: non ancora acquistato — necessario prima del task HTTPS
- Coolify: da installare da zero (VPS nuova, nessuna installazione preesistente)

**Fuori scope (di competenza delle story successive dell'epic):**
- Migrazione schema/RLS/dati dal progetto cloud → **US-043**
- Deploy del frontend SPA in container → **US-044**
- Backup periodico del database → **US-045**

---

## Soluzione Tecnica

Anziché scrivere e mantenere a mano un `docker-compose.yml` per l'intero stack Supabase (Postgres, Kong, GoTrue, PostgREST, Realtime, Storage, Meta, Studio, Edge Functions runtime), la scelta pragmatica è affidarsi al **servizio "Supabase" one-click di Coolify**, che è un fork mantenuto del compose ufficiale e si integra nativamente con il reverse proxy Traefik di Coolify per HTTPS/Let's Encrypt e con la sua UI di gestione env var per i segreti — risolvendo da solo 3 dei 4 criteri di accettazione senza codice custom da mantenere nel repo applicativo.

- **Provisioning**: VPS Contabo Ubuntu LTS, hardening minimo (utente non-root con sudo, SSH solo a chiave, `ufw` con porte 22/80/443/8000 aperte) — prerequisito per tutto il resto, non delegabile a Coolify.
- **Coolify**: installazione da zero via script ufficiale (`install.sh`), dashboard su porta 8000, protetta da primo accesso con creazione admin.
- **Stack Supabase**: deploy come risorsa "Supabase" nel progetto Coolify. Su 8GB RAM totali (con Coolify stesso e OS a occupare margine), **disabilitare Analytics/Logflare e Vector** (componenti di logging centralizzato non essenziali per un gestionale di questa scala) per liberare risorse a Postgres/Auth/PostgREST/Studio/Edge Functions, che restano tutti attivi.
- **DNS/HTTPS**: due sottodomini (es. `studio.<dominio>` per Studio, `api.<dominio>` per Kong/API gateway) puntati via record A all'IP della VPS; certificati emessi automaticamente da Coolify tramite Let's Encrypt sul proprio Traefik.
- **Segreti**: JWT secret, anon key, service role key, password Postgres generati/gestiti interamente nella UI Coolify (env var del servizio) — mai scritti nel repository applicativo; il runbook documenta solo *dove* trovarli, non i valori.
- **Resilienza al riavvio**: i container Coolify usano di default `restart: unless-stopped` — da **verificare con un riavvio reale della VPS**, non solo un `docker compose restart`, per dimostrare davvero il criterio di accettazione.
- **Documentazione**: un runbook in `docs/deploy/US-042-supabase-vps-setup.md` con endpoint, sottodomini, procedura di accesso ai segreti e passi di verifica — necessario perché US-043/US-044/US-045 dipendono da questi endpoint.

🔧 **Ugo:** Dal punto di vista implementativo, usare il template one-click di Coolify invece di un compose custom evita di dover mantenere manualmente i Dockerfile/healthcheck di 8+ servizi nel nostro repo — meno superficie da tenere aggiornata rispetto alle release Supabase. L'unico rischio reale è il sizing: se disattivare Analytics/Logflare non basta su 4 vCPU/8GB con Coolify stesso attivo, andrà rivalutato in corsa, ma è un tuning del task, non un cambio di approccio.

📐 **Leonardo:** Confermo l'approccio "boring tech that works" — nessun compose custom da versionare, nessuna gestione manuale dei certificati. Il punto da tenere fermo è la separazione degli scope: questa story si ferma a "stack attivo e raggiungibile", senza toccare schema o dati, che restano di US-024.

---

## Strategia di Test

Non essendoci codice applicativo in questa story, la verifica è manuale mirata sui 4 criteri di accettazione più un test di regressione infrastrutturale (il riavvio), non una suite automatizzata.

- **Smoke test raggiungibilità**: dashboard Coolify su `:8000`, poi Studio e endpoint Kong sui rispettivi sottodomini via browser/curl, verificando certificato TLS valido (no warning browser, `curl -v` mostra handshake TLS corretto).
- **Smoke test autenticazione**: creare un utente di test da Studio (o via chiamata diretta a GoTrue) e verificare login riuscito con le anon/service key generate — dimostra che Auth funziona end-to-end sull'istanza self-hosted.
- **Verifica segreti fuori repo**: checklist manuale — nessun valore di JWT secret/service role key/password DB presente in file tracciati da git (grep sul repo prima del commit finale della documentazione).
- **Test di resilienza al riavvio**: riavvio reale della VPS (`reboot` da Contabo o SSH), attesa boot completo, verifica che Coolify e tutti i container Supabase risultino `Up`/`healthy` senza intervento manuale.

🧪 **Mina:** L'unico punto da non derubricare a "ovvio" è proprio il riavvio reale — un `docker compose restart` locale non prova che i servizi ripartano dopo un boot dell'host, che è esattamente ciò che l'AC richiede.

---

## Task di Implementazione

| Stato | # | Task | Descrizione | Tipo | Dipendenze |
|---|---|---|---|---|---|
| TODO | TASK-01 | Provisioning e hardening VPS Contabo | Creare la VPS (4 vCPU/8GB, Ubuntu LTS), utente non-root con SSH a chiave, `ufw` con porte 22/80/443/8000 | Impl | - |
| TODO | TASK-02 | Installazione Docker Engine + Coolify | Installare Docker via `apt`, poi Coolify via script ufficiale; primo accesso e creazione admin | Impl | TASK-01 |
| TODO | TASK-03 | Smoke test dashboard Coolify | Verificare che la dashboard Coolify sia raggiungibile su `:8000` e login admin funzionante | Test | TASK-02 |
| TODO | TASK-04 | Configurazione DNS sottodomini | Acquisire/configurare dominio, creare record A per `studio.<dominio>` e `api.<dominio>` verso l'IP della VPS | Impl | TASK-01 |
| TODO | TASK-05 | Deploy stack Supabase via Coolify | Creare progetto Coolify, deploy risorsa "Supabase" one-click, disabilitare Analytics/Logflare/Vector per sizing 8GB | Impl | TASK-02 |
| TODO | TASK-06 | Configurazione HTTPS sui sottodomini | Collegare i sottodomini ai servizi Studio/Kong in Coolify, verificare emissione automatica certificati Let's Encrypt | Impl | TASK-04, TASK-05 |
| TODO | TASK-07 | Gestione segreti fuori repo | Verificare generazione JWT secret/anon key/service role key/password DB nella UI Coolify; nessun valore committato | Impl | TASK-05 |
| TODO | TASK-08 | Smoke test autenticazione | Creare utente di test da Studio, verificare login riuscito verso l'endpoint Auth self-hosted | Test | TASK-06, TASK-07 |
| TODO | TASK-09 | Test di resilienza al riavvio | Riavviare realmente la VPS e verificare che tutti i container (Coolify + stack Supabase) ripartano `healthy` senza intervento manuale | Test | TASK-08 |
| TODO | TASK-10 | Runbook di setup | Scrivere `docs/deploy/US-042-supabase-vps-setup.md` con endpoint, sottodomini, procedura di accesso ai segreti, passi di verifica | Impl | TASK-09 |

---

_Piano generato via Archetipo Planning — 2026-07-14_
