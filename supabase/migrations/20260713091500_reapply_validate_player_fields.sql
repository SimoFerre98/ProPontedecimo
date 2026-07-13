-- Ri-applica la versione corretta di validate_player_fields (US-009, commit 6752394).
--
-- Perché serve: il DB di produzione ha applicato la migrazione 20260707164300
-- nella sua versione originale (pre-fix), che validava incondizionatamente ogni
-- INSERT/UPDATE su players: senza il bypass per create_season_from_wizard e senza
-- il confronto NEW/OLD sui soli campi vincolati. Il fix è arrivato riscrivendo il
-- file 20260707164300 già registrato nello storico remoto, quindi `db push` non
-- lo riapplicherà mai. Questa migrazione ridefinisce la funzione in modo
-- idempotente: in locale (dove 20260707164300 è già la versione corretta) è un
-- no-op, in produzione allinea il trigger alla versione attesa dal codice.

CREATE OR REPLACE FUNCTION public.validate_player_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Bypass ad uso esclusivo di operazioni di sistema che copiano atleti già esistenti
  -- (es. RPC create_season_from_wizard, US-008): i dati storici sono spesso incompleti
  -- rispetto ai requisiti introdotti da questa story e non devono bloccare il passaggio
  -- di stagione. Impostato solo internamente dalla RPC per la durata della transazione.
  IF current_setting('app.bypass_player_validation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Su UPDATE, rivalida solo se uno dei campi vincolati sta effettivamente cambiando.
  -- Senza questo controllo, qualunque aggiornamento di sistema che tocca colonne non
  -- vincolate su una riga storica incompleta (es. trg_sync_medical_expiry che aggiorna
  -- solo medical_expiry dopo una visita medica, o un toggle di is_active/is_registered)
  -- verrebbe bloccato dall'incompletezza di campi che l'operazione non sta nemmeno
  -- toccando. Un INSERT (nuova riga o copia da wizard) è sempre validato per intero.
  IF TG_OP = 'UPDATE' AND
     NEW.first_name IS NOT DISTINCT FROM OLD.first_name AND
     NEW.last_name IS NOT DISTINCT FROM OLD.last_name AND
     NEW.birth_date IS NOT DISTINCT FROM OLD.birth_date AND
     NEW.birth_place IS NOT DISTINCT FROM OLD.birth_place AND
     NEW.citizenship IS NOT DISTINCT FROM OLD.citizenship AND
     NEW.team_sector IS NOT DISTINCT FROM OLD.team_sector AND
     NEW.address_street IS NOT DISTINCT FROM OLD.address_street AND
     NEW.address_city IS NOT DISTINCT FROM OLD.address_city AND
     NEW.address_zip IS NOT DISTINCT FROM OLD.address_zip AND
     NEW.email IS NOT DISTINCT FROM OLD.email AND
     NEW.phone_player IS NOT DISTINCT FROM OLD.phone_player AND
     NEW.phone_home IS NOT DISTINCT FROM OLD.phone_home AND
     NEW.privacy_accepted IS NOT DISTINCT FROM OLD.privacy_accepted AND
     NEW.tax_code IS NOT DISTINCT FROM OLD.tax_code AND
     NEW.parent1_name IS NOT DISTINCT FROM OLD.parent1_name AND
     NEW.parent1_phone IS NOT DISTINCT FROM OLD.parent1_phone AND
     NEW.parent2_name IS NOT DISTINCT FROM OLD.parent2_name AND
     NEW.parent2_phone IS NOT DISTINCT FROM OLD.parent2_phone
  THEN
    RETURN NEW;
  END IF;

  -- 1. Validazione anagrafica essenziale (non nulli e non vuoti dopo trim)
  IF NEW.first_name IS NULL OR trim(NEW.first_name) = '' THEN
    RAISE EXCEPTION 'Il nome dell''atleta è obbligatorio.';
  END IF;

  IF NEW.last_name IS NULL OR trim(NEW.last_name) = '' THEN
    RAISE EXCEPTION 'Il cognome dell''atleta è obbligatorio.';
  END IF;

  IF NEW.birth_date IS NULL THEN
    RAISE EXCEPTION 'La data di nascita dell''atleta è obbligatoria.';
  END IF;

  IF NEW.birth_place IS NULL OR trim(NEW.birth_place) = '' THEN
    RAISE EXCEPTION 'Il luogo di nascita dell''atleta è obbligatorio.';
  END IF;

  IF NEW.citizenship IS NULL OR trim(NEW.citizenship) = '' THEN
    RAISE EXCEPTION 'La cittadinanza dell''atleta è obbligatoria.';
  END IF;

  IF NEW.team_sector IS NULL OR trim(NEW.team_sector) = '' THEN
    RAISE EXCEPTION 'Il settore/leva dell''atleta è obbligatorio.';
  END IF;

  -- 2. Validazione residenza
  IF NEW.address_street IS NULL OR trim(NEW.address_street) = '' THEN
    RAISE EXCEPTION 'L''indirizzo di residenza è obbligatorio.';
  END IF;

  IF NEW.address_city IS NULL OR trim(NEW.address_city) = '' THEN
    RAISE EXCEPTION 'La città di residenza è obbligatoria.';
  END IF;

  IF NEW.address_zip IS NULL OR trim(NEW.address_zip) = '' THEN
    RAISE EXCEPTION 'Il CAP di residenza è obbligatorio.';
  END IF;

  -- 3. Validazione contatti
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RAISE EXCEPTION 'L''email di riferimento è obbligatoria.';
  END IF;

  IF (NEW.phone_player IS NULL OR trim(NEW.phone_player) = '')
     AND (NEW.phone_home IS NULL OR trim(NEW.phone_home) = '') THEN
    RAISE EXCEPTION 'È necessario inserire almeno un contatto telefonico (cellulare atleta o telefono fisso).';
  END IF;

  -- 4. Validazione consenso privacy
  IF NEW.privacy_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'Il consenso per il trattamento dei dati e della privacy è obbligatorio.';
  END IF;

  -- 5. Validazione codice fiscale
  IF NEW.tax_code IS NULL OR trim(NEW.tax_code) = '' THEN
    RAISE EXCEPTION 'Il codice fiscale dell''atleta è obbligatorio.';
  END IF;

  -- Regex standard codice fiscale italiano (16 caratteri alfanumerici specifici).
  -- trim() qui perché il frontend valida/mostra il codice fiscale già trimmato,
  -- ma invia il valore così come digitato (con eventuali spazi accidentali).
  IF NOT trim(NEW.tax_code) ~* '^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-MZ][0-9LMNPQRSTUV]{3}[A-Z]$' THEN
    RAISE EXCEPTION 'Il formato del codice fiscale dell''atleta non è valido.';
  END IF;

  -- 6. Validazione contatti genitori per minorenni (meno di 18 anni dalla data odierna)
  IF NEW.birth_date > (CURRENT_DATE - INTERVAL '18 years') THEN
    IF (NEW.parent1_name IS NULL OR trim(NEW.parent1_name) = '' OR NEW.parent1_phone IS NULL OR trim(NEW.parent1_phone) = '')
       AND (NEW.parent2_name IS NULL OR trim(NEW.parent2_name) = '' OR NEW.parent2_phone IS NULL OR trim(NEW.parent2_phone) = '') THEN
      RAISE EXCEPTION 'Per gli atleti minorenni è obbligatorio compilare i contatti (nome e telefono) di almeno un genitore.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE INSERT OR UPDATE per scattare prima di salvare sul database
CREATE OR REPLACE TRIGGER trg_validate_player_fields
BEFORE INSERT OR UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.validate_player_fields();
