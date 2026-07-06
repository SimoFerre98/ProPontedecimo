-- US-002: Hardening RLS per ruoli (president, director, coach, player, parent)
-- Chiude tre falle della baseline:
--   1. escalation di privilegio su profiles.role (chiunque poteva auto-promuoversi)
--   2. policy coach senza filtro squadra (vedeva tutti gli atleti e tutti i pagamenti)
--   3. ruolo parent privo di associazione genitore-figli e di policy

-- ============================================================
-- 1. Tabelle di associazione
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."coach_teams" (
    "profile_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "team_sector" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("profile_id", "team_sector")
);

ALTER TABLE "public"."coach_teams" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_teams_all_admin" ON "public"."coach_teams"
    USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

CREATE POLICY "coach_teams_select_self" ON "public"."coach_teams"
    FOR SELECT USING ("profile_id" = "auth"."uid"());

CREATE TABLE IF NOT EXISTS "public"."parent_players" (
    "parent_profile_id" "uuid" NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "player_id" "uuid" NOT NULL REFERENCES "public"."players"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("parent_profile_id", "player_id")
);

CREATE INDEX IF NOT EXISTS "idx_parent_players_player" ON "public"."parent_players" ("player_id");

ALTER TABLE "public"."parent_players" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_players_all_admin" ON "public"."parent_players"
    USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

CREATE POLICY "parent_players_select_self" ON "public"."parent_players"
    FOR SELECT USING ("parent_profile_id" = "auth"."uid"());

-- ============================================================
-- 2. Funzioni helper (SECURITY DEFINER, stesso pattern di get_user_role)
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_coach_sectors"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(array_agg(team_sector), '{}') FROM public.coach_teams WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."get_parent_player_ids"() RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(array_agg(player_id), '{}') FROM public.parent_players WHERE parent_profile_id = auth.uid();
$$;

-- Verifica se l'utente corrente è coach della leva a cui appartiene l'atleta indicato.
-- SECURITY DEFINER per evitare lookup ricorsivi soggetti a RLS dentro le policy.
CREATE OR REPLACE FUNCTION "public"."is_coach_of_player"("p_player_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    JOIN public.coach_teams ct ON ct.team_sector = p.team_sector
    WHERE p.id = p_player_id
      AND ct.profile_id = auth.uid()
  );
$$;

-- ============================================================
-- 3. Anti-escalation: solo il presidente può modificare i ruoli
--    (le policy non vedono OLD/NEW: serve un trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."enforce_role_change_policy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- auth.uid() NULL = service_role / accesso diretto al DB (strumenti amministrativi): consentito
    IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'president'::public.user_role THEN
      RAISE EXCEPTION 'Solo il Presidente puo'' modificare i ruoli utente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_enforce_role_change" ON "public"."profiles";
CREATE TRIGGER "trg_enforce_role_change"
    BEFORE UPDATE ON "public"."profiles"
    FOR EACH ROW EXECUTE FUNCTION "public"."enforce_role_change_policy"();

-- ============================================================
-- 4. Policy coach: filtro per leva di competenza + niente dati finanziari
-- ============================================================

-- Il coach vede solo gli atleti delle proprie leve
DROP POLICY IF EXISTS "players_select_coach" ON "public"."players";
CREATE POLICY "players_select_coach" ON "public"."players"
    FOR SELECT USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "team_sector" = ANY ("public"."get_coach_sectors"())
    );

-- Registro presenze: CRUD solo sugli atleti delle proprie leve
DROP POLICY IF EXISTS "attendance_cru_coach" ON "public"."attendance";
CREATE POLICY "attendance_all_coach_team" ON "public"."attendance"
    USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
    );

-- Visite mediche: sola lettura, solo proprie leve
DROP POLICY IF EXISTS "medical_select_coach" ON "public"."medical_visits";
CREATE POLICY "medical_select_coach" ON "public"."medical_visits"
    FOR SELECT USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
    );

-- Il coach NON vede alcun dato finanziario (AC3)
DROP POLICY IF EXISTS "payments_select_coach" ON "public"."payments";
DROP POLICY IF EXISTS "Staff can manage payments" ON "public"."payments";

-- ============================================================
-- 5. Policy parent: sola lettura sui figli associati
--    (nessun check di ruolo: la mappatura parent_players scopa già l'accesso)
-- ============================================================

CREATE POLICY "players_select_parent" ON "public"."players"
    FOR SELECT USING ("id" = ANY ("public"."get_parent_player_ids"()));

CREATE POLICY "medical_select_parent" ON "public"."medical_visits"
    FOR SELECT USING ("player_id" = ANY ("public"."get_parent_player_ids"()));

CREATE POLICY "payments_select_parent" ON "public"."payments"
    FOR SELECT USING ("player_id" = ANY ("public"."get_parent_player_ids"()));

CREATE POLICY "attendance_select_parent" ON "public"."attendance"
    FOR SELECT USING ("player_id" = ANY ("public"."get_parent_player_ids"()));

-- ============================================================
-- 6. Hardening residuo: email_usage riservata allo staff amministrativo
-- ============================================================

DROP POLICY IF EXISTS "authenticated users can read email_usage" ON "public"."email_usage";
CREATE POLICY "email_usage_select_admin" ON "public"."email_usage"
    FOR SELECT USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

DROP POLICY IF EXISTS "authenticated users can insert email_usage" ON "public"."email_usage";
CREATE POLICY "email_usage_insert_admin" ON "public"."email_usage"
    FOR INSERT WITH CHECK (
        "public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])
        AND "auth"."uid"() = "sent_by"
    );
