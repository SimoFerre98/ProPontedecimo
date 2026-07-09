-- US-014: Feed iCal personalizzato per la sincronizzazione esterna
--
-- Aggiunge la colonna `ics_token` alla tabella `profiles` e definisce la RPC `regenerate_ics_token`
-- per rigenerare il token per l'utente autenticato.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ics_token uuid UNIQUE;

CREATE OR REPLACE FUNCTION public.regenerate_ics_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    new_token uuid;
BEGIN
    new_token := gen_random_uuid();
    UPDATE public.profiles
    SET ics_token = new_token
    WHERE id = auth.uid();
    RETURN new_token;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.regenerate_ics_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_ics_token() TO service_role;
