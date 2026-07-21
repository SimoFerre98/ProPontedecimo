-- ============================================================
-- US-034: Feed notifiche color-coded — TASK-01/02/03
-- Introduce la tabella announcements (bacheca societaria, append-only,
-- distinta dalle "notifiche" di scadenze operative già esistenti in
-- notificationService.ts/useNotifications.ts) e lo scoping per leva,
-- con lo stesso pattern scrittura-staff/lettura-pubblico di call_ups
-- (US-032) e get_parent_player_ids() (US-027) — vedi CLAUDE.md,
-- "Superfici condivise".
-- ============================================================

-- 1. Enum gravità
CREATE TYPE "public"."announcement_severity" AS ENUM ('urgent', 'reminder', 'communication');

-- 2. Tabella announcements: nessuna colonna di stato/pubblicazione,
--    è un feed append-only in sola creazione (fuori scope il ciclo
--    bozza→pubblicata per una story Vision a grana grossa).
--    team_sector nullable: NULL = comunicazione a tutta la società.
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_by" uuid,
    "severity" "public"."announcement_severity" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "team_sector" "text",
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_announcements_team_sector" ON "public"."announcements" USING "btree" ("team_sector");
CREATE INDEX IF NOT EXISTS "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);

ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;

-- 3. Helper RLS: variante di is_coach_of_player che confronta direttamente
--    su coach_teams, utile perché qui si parte da un settore scelto in un
--    dropdown e non da un player_id.
CREATE OR REPLACE FUNCTION "public"."is_coach_of_sector"("p_team_sector" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_teams ct
    WHERE ct.team_sector = p_team_sector
      AND ct.profile_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_coach_of_sector(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_coach_of_sector(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of_sector(text) TO service_role;

-- 4. Helper RLS pubblico: ritorna i settori visibili per il player/parent
--    loggato. Per il parent riusa get_parent_player_ids(), che filtra già
--    status = 'confirmed' — rispetta l'invariante documentato in CLAUDE.md
--    (mai includere righe pending). SECURITY DEFINER perché player/parent
--    non hanno policy SELECT dirette su players per calcolare lo scoping
--    di un profilo diverso dal proprio (caso parent).
CREATE OR REPLACE FUNCTION "public"."get_my_announcement_sectors"() RETURNS "text"[]
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role public.user_role;
  v_sectors text[];
BEGIN
  v_role := public.get_user_role();

  IF v_role = 'player' THEN
    SELECT COALESCE(array_agg(DISTINCT team_sector), '{}')
    INTO v_sectors
    FROM public.players
    WHERE profile_id = auth.uid()
      AND team_sector IS NOT NULL;
  ELSIF v_role = 'parent' THEN
    SELECT COALESCE(array_agg(DISTINCT team_sector), '{}')
    INTO v_sectors
    FROM public.players
    WHERE id = ANY (public.get_parent_player_ids())
      AND team_sector IS NOT NULL;
  ELSE
    v_sectors := '{}';
  END IF;

  RETURN v_sectors;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_announcement_sectors() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_announcement_sectors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_announcement_sectors() TO service_role;

-- 5. RLS — admin (president/director): nessuna restrizione di leva,
--    stesso pattern di call_ups_all_admin/coach_teams_all_admin.
DROP POLICY IF EXISTS "announcements_all_admin" ON "public"."announcements";
CREATE POLICY "announcements_all_admin" ON "public"."announcements"
    USING ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]))
    WITH CHECK ("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"]));

-- 6. RLS — coach: scrittura solo sulla propria leva (mai "tutta la società",
--    riservato a president/director), lettura sulle proprie leve + le
--    comunicazioni a tutta la società.
DROP POLICY IF EXISTS "announcements_insert_coach" ON "public"."announcements";
CREATE POLICY "announcements_insert_coach" ON "public"."announcements"
    FOR INSERT WITH CHECK (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND "team_sector" IS NOT NULL
        AND "public"."is_coach_of_sector"("team_sector")
    );

DROP POLICY IF EXISTS "announcements_select_coach" ON "public"."announcements";
CREATE POLICY "announcements_select_coach" ON "public"."announcements"
    FOR SELECT USING (
        "public"."get_user_role"() = 'coach'::"public"."user_role"
        AND ("team_sector" IS NULL OR "public"."is_coach_of_sector"("team_sector"))
    );

-- 7. RLS — pubblico (player/parent): sola lettura, propria leva o
--    comunicazioni a tutta la società.
DROP POLICY IF EXISTS "announcements_select_public" ON "public"."announcements";
CREATE POLICY "announcements_select_public" ON "public"."announcements"
    FOR SELECT USING (
        "public"."get_user_role"() = ANY (ARRAY['player'::"public"."user_role", 'parent'::"public"."user_role"])
        AND ("team_sector" IS NULL OR "team_sector" = ANY ("public"."get_my_announcement_sectors"()))
    );
