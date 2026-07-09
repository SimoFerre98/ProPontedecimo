-- Create event_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.event_type AS ENUM ('training', 'home_match', 'away_match', 'meeting', 'generic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    event_type public.event_type NOT NULL,
    start_date timestamp with time zone NOT NULL,
    meetup_time timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT check_meetup_time CHECK (
        event_type NOT IN ('home_match', 'away_match') OR meetup_time IS NOT NULL
    )
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS events_all_admin ON public.events;
CREATE POLICY events_all_admin ON public.events
    USING (public.get_user_role() = ANY (ARRAY['president'::public.user_role, 'director'::public.user_role]))
    WITH CHECK (public.get_user_role() = ANY (ARRAY['president'::public.user_role, 'director'::public.user_role]));

DROP POLICY IF EXISTS events_all_coach ON public.events;
CREATE POLICY events_all_coach ON public.events
    USING (public.get_user_role() = 'coach'::public.user_role)
    WITH CHECK (public.get_user_role() = 'coach'::public.user_role);

-- Grants
GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;
