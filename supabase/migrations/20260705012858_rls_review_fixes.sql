-- US-002: correzioni dalla code review (la migrazione 20260705011817 è già applicata
-- in produzione, quindi le rettifiche vivono in questa migrazione incrementale).
--
--   C2: email_usage estesa al coach (la UI espone "Invia Email" anche a lui;
--       restringerla a president/director avrebbe rotto quote e logging dei suoi invii)
--   M1: trigger anti-escalation esteso all'INSERT su profiles (difesa in profondità:
--       senza, un utente con profilo mancante potrebbe ricrearselo con ruolo elevato)
--   M3: policy parent vincolate anche al ruolo 'parent' (un'associazione errata in
--       parent_players non basta più a dare accesso a un non-genitore)
--   M8: WITH CHECK esplicito sulle policy FOR ALL nuove (comportamento invariato,
--       intenzione leggibile)

-- ============================================================
-- C2: email_usage per tutto lo staff (president, director, coach)
-- ============================================================

DROP POLICY IF EXISTS "email_usage_select_admin" ON "public"."email_usage";
CREATE POLICY "email_usage_select_staff" ON "public"."email_usage"
    FOR SELECT USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role", 'coach'::"public"."user_role"]));

DROP POLICY IF EXISTS "email_usage_insert_admin" ON "public"."email_usage";
CREATE POLICY "email_usage_insert_staff" ON "public"."email_usage"
    FOR INSERT WITH CHECK (
        "public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role", 'coach'::"public"."user_role"])
        AND "auth"."uid"() = "sent_by"
    );

-- ============================================================
-- M1: anti-escalation anche su INSERT
-- ============================================================

-- NOTA: il bypass con auth.uid() NULL è voluto (service_role/strumenti amministrativi:
-- la RLS non si applica a loro ma i trigger sì). Qualsiasi futura funzione SECURITY
-- DEFINER di proprietà postgres che tocca profiles in un contesto senza JWT eredita
-- questo bypass: tenerne conto quando se ne aggiungono.
CREATE OR REPLACE FUNCTION "public"."enforce_role_change_policy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- un utente può (ri)creare solo un profilo con ruolo base
    IF NEW.role IS DISTINCT FROM 'player'::public.user_role
       AND public.get_user_role() IS DISTINCT FROM 'president'::public.user_role THEN
      RAISE EXCEPTION 'Solo il Presidente puo'' assegnare ruoli diversi da player';
    END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role
        AND public.get_user_role() IS DISTINCT FROM 'president'::public.user_role THEN
    RAISE EXCEPTION 'Solo il Presidente puo'' modificare i ruoli utente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_enforce_role_change" ON "public"."profiles";
CREATE TRIGGER "trg_enforce_role_change"
    BEFORE INSERT OR UPDATE ON "public"."profiles"
    FOR EACH ROW EXECUTE FUNCTION "public"."enforce_role_change_policy"();

-- ============================================================
-- M3: le policy parent richiedono anche il ruolo 'parent'
-- ============================================================

DROP POLICY IF EXISTS "players_select_parent" ON "public"."players";
CREATE POLICY "players_select_parent" ON "public"."players"
    FOR SELECT USING (
        "public"."get_user_role"() = 'parent'::"public"."user_role"
        AND "id" = ANY ("public"."get_parent_player_ids"())
    );

DROP POLICY IF EXISTS "medical_select_parent" ON "public"."medical_visits";
CREATE POLICY "medical_select_parent" ON "public"."medical_visits"
    FOR SELECT USING (
        "public"."get_user_role"() = 'parent'::"public"."user_role"
        AND "player_id" = ANY ("public"."get_parent_player_ids"())
    );

DROP POLICY IF EXISTS "payments_select_parent" ON "public"."payments";
CREATE POLICY "payments_select_parent" ON "public"."payments"
    FOR SELECT USING (
        "public"."get_user_role"() = 'parent'::"public"."user_role"
        AND "player_id" = ANY ("public"."get_parent_player_ids"())
    );

DROP POLICY IF EXISTS "attendance_select_parent" ON "public"."attendance";
CREATE POLICY "attendance_select_parent" ON "public"."attendance"
    FOR SELECT USING (
        "public"."get_user_role"() = 'parent'::"public"."user_role"
        AND "player_id" = ANY ("public"."get_parent_player_ids"())
    );

-- ============================================================
-- M8: WITH CHECK esplicito sulle policy FOR ALL introdotte da US-002
-- ============================================================

DROP POLICY IF EXISTS "coach_teams_all_admin" ON "public"."coach_teams";
CREATE POLICY "coach_teams_all_admin" ON "public"."coach_teams"
    USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]))
    WITH CHECK ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

DROP POLICY IF EXISTS "parent_players_all_admin" ON "public"."parent_players";
CREATE POLICY "parent_players_all_admin" ON "public"."parent_players"
    USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]))
    WITH CHECK ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

DROP POLICY IF EXISTS "attendance_all_coach_team" ON "public"."attendance";
CREATE POLICY "attendance_all_coach_team" ON "public"."attendance"
    USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
    )
    WITH CHECK (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "public"."is_coach_of_player"("player_id")
    );
