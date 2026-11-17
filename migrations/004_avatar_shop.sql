BEGIN;

-- Credits are awarded only by server-confirmed first lesson completions.
-- Existing completed lessons are deliberately not backfilled or re-awarded.
CREATE TABLE IF NOT EXISTS public.lesson_xp_rewards (
    user_id bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    lesson_id bigint NOT NULL REFERENCES public.lessons(lesson_id) ON DELETE CASCADE,
    xp integer NOT NULL CHECK (xp = 15),
    earned_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.avatar_purchases (
    user_id bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id text NOT NULL CHECK (item_id IN ('beanie', 'glasses', 'headband', 'propeller-cap', 'charm')),
    cost integer NOT NULL CHECK (cost = 15),
    purchased_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.user_avatars (
    user_id bigint PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    character text NOT NULL DEFAULT 'algwas' CHECK (character IN ('algwas', 'connie', 'orange')),
    equipped jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(equipped) = 'object'),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
