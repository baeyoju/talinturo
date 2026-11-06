ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_duration_minutes_check;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'lessons'
          AND column_name = 'duration_minutes'
          AND data_type NOT IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.lessons
            ALTER COLUMN duration_minutes TYPE text
            USING CASE
                WHEN duration_minutes IS NULL THEN NULL
                ELSE duration_minutes::text || ':00'
            END;
    END IF;
END;
$$;

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_duration_minutes_format_check,
    ADD CONSTRAINT lessons_duration_minutes_format_check
        CHECK (
            duration_minutes IS NULL
            OR duration_minutes ~ '^[0-9]+:[0-5][0-9]$'
        );
