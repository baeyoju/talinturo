-- Apply after sql/talinturo_schema.sql (or an equivalent current schema).
-- Additive and repeatable: existing users, preferences, and memberships are kept.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_onboarding (
    user_id bigint PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    birthdate date NOT NULL,
    daily_goal_minutes smallint NOT NULL CHECK (daily_goal_minutes IN (5, 10, 15)),
    motivation varchar(60) NOT NULL CHECK (motivation IN ('Just for fun!', 'Family Communication', 'Socializing')),
    sensory_preference varchar(20) NOT NULL CHECK (sensory_preference IN ('audio', 'haptics')),
    classroom_id bigint REFERENCES public.classrooms(classroom_id) ON DELETE SET NULL,
    completed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
