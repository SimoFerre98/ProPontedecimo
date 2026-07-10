-- Migration to sync auth.users email update to public.profiles
-- Target: US-018

CREATE OR REPLACE FUNCTION "public"."handle_auth_user_email_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Se l'email è effettivamente cambiata, aggiorna profiles.email
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "on_auth_user_email_updated" ON "auth"."users";
CREATE TRIGGER "on_auth_user_email_updated"
  AFTER UPDATE OF email ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_auth_user_email_update"();
