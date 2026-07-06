


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."inventory_category" AS ENUM (
    'kit',
    'equipment',
    'trophy',
    'other'
);


ALTER TYPE "public"."inventory_category" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'overdue'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'todo',
    'in_progress',
    'done',
    'ready',
    'archive',
    'created'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE TYPE "public"."training_type" AS ENUM (
    'training',
    'match',
    'event'
);


ALTER TYPE "public"."training_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'president',
    'director',
    'coach',
    'player',
    'parent'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_players INT;
  expiring_medical INT;
  urgent_medical INT;
  pending_payments INT;
  sectors_data JSON;
  today DATE := CURRENT_DATE;
  in_30_days DATE := CURRENT_DATE + INTERVAL '30 days';
  in_7_days DATE := CURRENT_DATE + INTERVAL '7 days';
BEGIN
  -- Totale atleti attivi
  SELECT count(*) INTO total_players FROM players WHERE is_active = true;
  
  -- Scadenze mediche nei prossimi 30 giorni
  SELECT count(*) INTO expiring_medical FROM players 
    WHERE is_active = true 
    AND medical_expiry >= today 
    AND medical_expiry <= in_30_days;

  -- Scadenze mediche entro 7 giorni (urgenti)
  SELECT count(*) INTO urgent_medical FROM players 
    WHERE is_active = true 
    AND medical_expiry >= today 
    AND medical_expiry <= in_7_days;

  -- Pagamenti pending
  SELECT count(*) INTO pending_payments FROM payments WHERE status = 'pending';

  -- Atleti per settore
  SELECT COALESCE(json_agg(json_build_object('sector', COALESCE(team_sector, 'Non assegnato'), 'count', c)), '[]'::json)
  INTO sectors_data
  FROM (
    SELECT team_sector, count(*) as c 
    FROM players 
    WHERE is_active = true 
    GROUP BY team_sector
    ORDER BY c DESC
  ) as s;

  -- Ritorna tutto insieme
  RETURN json_build_object(
    'totalPlayers', total_players,
    'expiringMedical', expiring_medical,
    'urgentMedical', urgent_medical,
    'pendingPayments', pending_payments,
    'sectors', sectors_data
  );
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_medical_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.players
  SET medical_expiry = NEW.expiry_date, updated_at = now()
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_medical_expiry"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "session_date" "date" NOT NULL,
    "type" "public"."training_type" DEFAULT 'training'::"public"."training_type",
    "present" boolean DEFAULT false,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_by" "uuid",
    "recipient_count" integer DEFAULT 1 NOT NULL,
    "subject" "text",
    "group_target" "text"
);


ALTER TABLE "public"."email_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "public"."inventory_category" DEFAULT 'other'::"public"."inventory_category",
    "quantity" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "inventory_items_quantity_check" CHECK (("quantity" >= 0))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "visit_date" "date" NOT NULL,
    "expiry_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."medical_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "installment_no" integer DEFAULT 1 NOT NULL,
    "amount_eur" numeric(8,2),
    "receipt_number" "text",
    "receipt_date" "date",
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "plan" "text" DEFAULT 'installments'::"text",
    "due_date" "date",
    "paid_amount_eur" numeric(10,2),
    "payment_method" "text",
    CONSTRAINT "payments_installment_no_check" CHECK (("installment_no" >= 1)),
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['satispay'::"text", 'contanti'::"text", 'pos'::"text", 'iban'::"text"]))),
    CONSTRAINT "payments_plan_check" CHECK (("plan" = ANY (ARRAY['annual'::"text", 'installments'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "legacy_id" integer,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "team_sector" "text",
    "citizenship" "text",
    "birth_date" "date",
    "birth_place" "text",
    "tax_code" "text",
    "address_street" "text",
    "address_locality" "text",
    "address_city" "text",
    "address_zip" "text",
    "phone_home" "text",
    "phone_player" "text",
    "parent1_name" "text",
    "parent1_phone" "text",
    "parent1_tax_code" "text",
    "parent2_name" "text",
    "parent2_phone" "text",
    "parent2_tax_code" "text",
    "email" "text",
    "figc_registration" "text",
    "medical_expiry" "date",
    "notes" "text",
    "privacy_accepted" boolean DEFAULT false,
    "profile_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_registered" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" DEFAULT 'player'::"public"."user_role" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "assigned_to" "uuid",
    "status" "public"."task_status" DEFAULT 'todo'::"public"."task_status",
    "due_date" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "start_date" timestamp with time zone DEFAULT CURRENT_DATE,
    "end_date" timestamp with time zone
);


ALTER TABLE "public"."staff_tasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_player_id_session_date_type_key" UNIQUE ("player_id", "session_date", "type");



ALTER TABLE ONLY "public"."email_usage"
    ADD CONSTRAINT "email_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_visits"
    ADD CONSTRAINT "medical_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_player_id_season_id_installment_no_key" UNIQUE ("player_id", "season_id", "installment_no");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_season_id_tax_code_key" UNIQUE ("season_id", "tax_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_tasks"
    ADD CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "email_usage_sent_at_idx" ON "public"."email_usage" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_attendance_date" ON "public"."attendance" USING "btree" ("session_date");



CREATE INDEX "idx_attendance_player" ON "public"."attendance" USING "btree" ("player_id");



CREATE INDEX "idx_medical_visits_expiry" ON "public"."medical_visits" USING "btree" ("expiry_date");



CREATE INDEX "idx_medical_visits_player" ON "public"."medical_visits" USING "btree" ("player_id");



CREATE INDEX "idx_payments_player" ON "public"."payments" USING "btree" ("player_id");



CREATE INDEX "idx_payments_season" ON "public"."payments" USING "btree" ("season_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_players_profile" ON "public"."players" USING "btree" ("profile_id");



CREATE INDEX "idx_players_season" ON "public"."players" USING "btree" ("season_id");



CREATE INDEX "idx_players_sector" ON "public"."players" USING "btree" ("team_sector");



CREATE INDEX "idx_staff_tasks_assigned" ON "public"."staff_tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_staff_tasks_status" ON "public"."staff_tasks" USING "btree" ("status");



CREATE UNIQUE INDEX "seasons_active_unique" ON "public"."seasons" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "trg_sync_medical_expiry" AFTER INSERT OR UPDATE ON "public"."medical_visits" FOR EACH ROW EXECUTE FUNCTION "public"."sync_medical_expiry"();



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_usage"
    ADD CONSTRAINT "email_usage_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."medical_visits"
    ADD CONSTRAINT "medical_visits_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_tasks"
    ADD CONSTRAINT "staff_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_tasks"
    ADD CONSTRAINT "staff_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Staff can manage payments" ON "public"."payments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role", 'coach'::"public"."user_role"]))))));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_all_admin" ON "public"."attendance" USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "attendance_cru_coach" ON "public"."attendance" USING (("public"."get_user_role"() = 'coach'::"public"."user_role"));



CREATE POLICY "attendance_select_self" ON "public"."attendance" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."profile_id" = "auth"."uid"()))));



CREATE POLICY "authenticated users can insert email_usage" ON "public"."email_usage" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sent_by"));



CREATE POLICY "authenticated users can read email_usage" ON "public"."email_usage" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."email_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_all_admin" ON "public"."inventory_items" USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_select_coach" ON "public"."inventory_items" FOR SELECT USING (("public"."get_user_role"() = 'coach'::"public"."user_role"));



CREATE POLICY "medical_all_admin" ON "public"."medical_visits" USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "medical_select_coach" ON "public"."medical_visits" FOR SELECT USING (("public"."get_user_role"() = 'coach'::"public"."user_role"));



CREATE POLICY "medical_select_self" ON "public"."medical_visits" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."profile_id" = "auth"."uid"()))));



ALTER TABLE "public"."medical_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_all_admin" ON "public"."payments" USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "payments_select_coach" ON "public"."payments" FOR SELECT USING (("public"."get_user_role"() = 'coach'::"public"."user_role"));



CREATE POLICY "payments_select_self" ON "public"."payments" FOR SELECT USING (("player_id" IN ( SELECT "players"."id"
   FROM "public"."players"
  WHERE ("players"."profile_id" = "auth"."uid"()))));



ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "players_all_admin" ON "public"."players" USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "players_select_coach" ON "public"."players" FOR SELECT USING (("public"."get_user_role"() = 'coach'::"public"."user_role"));



CREATE POLICY "players_select_self" ON "public"."players" FOR SELECT USING (("profile_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_trigger" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_admin" ON "public"."profiles" FOR SELECT USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_admin" ON "public"."profiles" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_all_president" ON "public"."seasons" USING (("public"."get_user_role"() = 'president'::"public"."user_role"));



CREATE POLICY "seasons_select_all" ON "public"."seasons" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."staff_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_all_admin" ON "public"."staff_tasks" USING (("public"."get_user_role"() = ANY (ARRAY['president'::"public"."user_role", 'director'::"public"."user_role"])));



CREATE POLICY "tasks_select_coach" ON "public"."staff_tasks" FOR SELECT USING (("public"."get_user_role"() = 'coach'::"public"."user_role"));



CREATE POLICY "tasks_update_coach_own" ON "public"."staff_tasks" FOR UPDATE USING ((("public"."get_user_role"() = 'coach'::"public"."user_role") AND ("assigned_to" = "auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_medical_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_medical_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_medical_expiry"() TO "service_role";


















GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."email_usage" TO "anon";
GRANT ALL ON TABLE "public"."email_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."email_usage" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."medical_visits" TO "anon";
GRANT ALL ON TABLE "public"."medical_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_visits" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."staff_tasks" TO "anon";
GRANT ALL ON TABLE "public"."staff_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Oggetti non inclusi nel dump automatico (schema auth gestito da Supabase).
-- Sul progetto cloud attuale questa baseline è marcata come già applicata e non viene rieseguita;
-- queste istruzioni servono per riprodurre lo schema completo su nuovi ambienti (es. VPS self-hosted).
--

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
