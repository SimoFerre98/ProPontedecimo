-- Test script per il trigger validate_player_fields
-- Esegue i test all'interno di una transazione che fa ROLLBACK alla fine

BEGIN;

DO $$
DECLARE
  v_season_id uuid;
  v_player_id uuid;
BEGIN
  -- Trova o crea una stagione attiva per i test
  SELECT id INTO v_season_id FROM seasons WHERE is_active = true LIMIT 1;
  IF v_season_id IS NULL THEN
    INSERT INTO seasons (name, start_date, end_date, is_active)
    VALUES ('Stagione Test', '2026-07-01', '2027-06-30', true)
    RETURNING id INTO v_season_id;
  END IF;

  RAISE NOTICE 'Inizio test trigger validate_player_fields con season_id: %', v_season_id;

  -- ==========================================
  -- TEST 1: Inserimento atleta maggiorenne corretto (HAPPY PATH)
  -- ==========================================
  BEGIN
    INSERT INTO players (
      season_id, first_name, last_name, birth_date, birth_place, citizenship, 
      team_sector, address_street, address_city, address_zip, email, 
      phone_player, privacy_accepted, tax_code
    ) VALUES (
      v_season_id, 'Mario', 'Rossi', '1990-01-01', 'Genova', 'Italiana',
      'Prima Squadra', 'Via Roma 1', 'Genova', '16100', 'mario.rossi@example.com',
      '3331122333', true, 'RSSMRA90A01D969X'
    ) RETURNING id INTO v_player_id;
    RAISE NOTICE 'TEST 1 Superato: Inserimento atleta maggiorenne riuscito.';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 1 Fallito: % (%)', SQLERRM, SQLSTATE;
  END;

  -- ==========================================
  -- TEST 2: Inserimento codice fiscale non valido (REGEXP)
  -- ==========================================
  BEGIN
    INSERT INTO players (
      season_id, first_name, last_name, birth_date, birth_place, citizenship, 
      team_sector, address_street, address_city, address_zip, email, 
      phone_player, privacy_accepted, tax_code
    ) VALUES (
      v_season_id, 'Mario', 'Rossi', '1990-01-01', 'Genova', 'Italiana',
      'Prima Squadra', 'Via Roma 1', 'Genova', '16100', 'mario.rossi@example.com',
      '3331122333', true, 'RSSMRA90A01D969' -- Lunghezza errata
    );
    RAISE WARNING 'TEST 2 Fallito: Inserimento consentito con codice fiscale invalido.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%codice fiscale%non è valido%' THEN
      RAISE NOTICE 'TEST 2 Superato: Inserimento bloccato con successo (codice fiscale non valido).';
    ELSE
      RAISE WARNING 'TEST 2 Fallito con errore inatteso: %', SQLERRM;
    END IF;
  END;

  -- ==========================================
  -- TEST 3: Inserimento atleta minorenne senza contatti genitori
  -- ==========================================
  BEGIN
    INSERT INTO players (
      season_id, first_name, last_name, birth_date, birth_place, citizenship, 
      team_sector, address_street, address_city, address_zip, email, 
      phone_player, privacy_accepted, tax_code
    ) VALUES (
      v_season_id, 'Luigi', 'Verdi', '2015-05-15', 'Genova', 'Italiana',
      'Primi Calci', 'Via Roma 2', 'Genova', '16100', 'luigi.verdi@example.com',
      '3331122334', true, 'VRDLGU15E15D969J'
    );
    RAISE WARNING 'TEST 3 Fallito: Inserimento consentito per minorenne senza genitori.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%atleti minorenni%genitore%' THEN
      RAISE NOTICE 'TEST 3 Superato: Inserimento bloccato con successo (contatti genitore mancanti).';
    ELSE
      RAISE WARNING 'TEST 3 Fallito con errore inatteso: %', SQLERRM;
    END IF;
  END;

  -- ==========================================
  -- TEST 4: Inserimento atleta minorenne con contatti genitore (HAPPY PATH)
  -- ==========================================
  BEGIN
    INSERT INTO players (
      season_id, first_name, last_name, birth_date, birth_place, citizenship, 
      team_sector, address_street, address_city, address_zip, email, 
      phone_player, privacy_accepted, tax_code,
      parent1_name, parent1_phone
    ) VALUES (
      v_season_id, 'Luigi', 'Verdi', '2015-05-15', 'Genova', 'Italiana',
      'Primi Calci', 'Via Roma 2', 'Genova', '16100', 'luigi.verdi@example.com',
      '3331122334', true, 'VRDLGU15E15D969J',
      'Mario Verdi', '3335556677'
    );
    RAISE NOTICE 'TEST 4 Superato: Inserimento atleta minorenne con genitore riuscito.';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST 4 Fallito: % (%)', SQLERRM, SQLSTATE;
  END;

  -- ==========================================
  -- TEST 5: Aggiornamento record esistente violando vincoli
  -- ==========================================
  BEGIN
    UPDATE players 
    SET citizenship = '' 
    WHERE id = v_player_id;
    RAISE WARNING 'TEST 5 Fallito: Aggiornamento consentito con cittadinanza vuota.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%cittadinanza%obbligatoria%' THEN
      RAISE NOTICE 'TEST 5 Superato: Aggiornamento bloccato con successo (cittadinanza vuota).';
    ELSE
      RAISE WARNING 'TEST 5 Fallito con errore inatteso: %', SQLERRM;
    END IF;
  END;

END $$;

ROLLBACK;
