# Architettura Edge Functions

## Panoramica

L'applicazione utilizza le [Supabase Edge Functions](https://supabase.com/docs/guides/functions) (basate su Deno) per eseguire logica backend server-side in modo sicuro, senza esporre segreti al frontend.

Le funzioni sono contenute in `supabase/functions/` e condividono utility tramite la cartella `_shared/`.

### Funzioni implementate

1. **`send-email`**: Funzione generica per l'invio di email.
   - **Endpoint:** `POST /functions/v1/send-email`
   - **Autenticazione:** Richiede un JWT valido nell'header `Authorization`. Il chiamante deve avere un ruolo autorizzato (`president`, `director`, `coach`).
   - **Body:** `{ to: string | string[], subject: string, html: string, groupTarget?: string }`
   - **Comportamento:**
     - Avvolge l'HTML fornito in un template brandizzato (`baseLayout`).
     - Invia l'email tramite le API di Resend.
     - Registra l'operazione nella tabella `email_usage` per tenere traccia delle quote.

2. **`medical-reminders`**: Funzione specifica per l'invio dei promemoria delle visite mediche.
   - **Endpoint:** `POST /functions/v1/medical-reminders`
   - **Autenticazione:** Accetta il `SUPABASE_SERVICE_ROLE_KEY` (per lo scheduling via pg_cron) oppure il JWT di uno staff per l'invocazione manuale.
   - **Body:** `{ daysWarning?: number }` (default: 15)
   - **Comportamento:**
     - Interroga la tabella `players` per trovare atleti attivi con `medical_expiry` valida ed email associata.
     - Calcola i giorni rimanenti e invia un promemoria (solo per scadenze a esattamente 15 giorni o 0 giorni).
     - Usa il template grafico `medicalReminderTemplate`.
     - Registra un'unica riga su `email_usage` per il batch inviato.

---

## Gestione Segreti

I segreti **non devono mai essere versionati nel repository** né inseriti nel frontend.
Per le Edge Functions, i segreti vengono iniettati nell'ambiente di runtime di Supabase.

Segreti richiesti:
- `RESEND_API_KEY`: API key di Resend per l'invio delle email.
- `RESEND_FROM_EMAIL`: (Opzionale) Indirizzo mittente personalizzato. Di default usa l'indirizzo sandbox di Resend.

Per impostare i segreti in locale o in cloud, usare la CLI di Supabase:

```bash
# Impostare un segreto
npx supabase secrets set RESEND_API_KEY=re_123...

# Verificare i segreti impostati
npx supabase secrets list
```

Nel file `.env.example` sono presenti dei placeholder documentativi per ricordare quali segreti configurare.

---

## Deploy

Per eseguire il deploy delle funzioni sul progetto Supabase collegato (definito in `supabase/config.toml` o `.supabase/`):

```bash
# Deploy di una singola funzione
npx supabase functions deploy send-email

# Deploy di tutte le funzioni
npx supabase functions deploy
```

Il comando farà l'upload del codice Deno, risolverà i moduli e attiverà le funzioni.
Assicurarsi di aver prima eseguito `supabase link --project-ref <ID>` se non è già stato fatto.

---

## Schedulazione Automatica (pg_cron / pg_net)

In futuro, per automatizzare i promemoria (es: ogni mattina alle 08:00), si consiglia l'uso di **Supabase Scheduled Functions** (basato su pg_cron e pg_net).
Questo l'approccio consigliato da aggiungere via migrazione SQL quando sarà il momento:

```sql
select
  cron.schedule(
    'invoke-medical-reminders',
    '0 8 * * *', -- Ogni giorno alle 08:00
    $$
    select
      net.http_post(
          url:='https://<project-ref>.supabase.co/functions/v1/medical-reminders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_SERVICE_ROLE_KEY>"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );
```
Questa configurazione è da applicare solo quando la qualità dei dati (email delle famiglie) sarà stata verificata.
