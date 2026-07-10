-- Migration: attendance_tristate
-- Create attendance_status enum, add status column, backfill and drop present column.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE "public"."attendance_status" AS ENUM ('present', 'absent', 'justified');
    END IF;
END
$$;

-- Add new status column
ALTER TABLE "public"."attendance" ADD COLUMN IF NOT EXISTS "status" "public"."attendance_status";

-- Backfill from present column
UPDATE "public"."attendance"
SET "status" = CASE 
    WHEN "present" = true THEN 'present'::"public"."attendance_status"
    ELSE 'absent'::"public"."attendance_status"
END;

-- Set status column NOT NULL and default
ALTER TABLE "public"."attendance" ALTER COLUMN "status" SET DEFAULT 'absent'::"public"."attendance_status";
ALTER TABLE "public"."attendance" ALTER COLUMN "status" SET NOT NULL;

-- Drop old present column
ALTER TABLE "public"."attendance" DROP COLUMN IF EXISTS "present";
