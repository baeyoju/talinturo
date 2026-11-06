ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS image_url text,
    ADD COLUMN IF NOT EXISTS video_url text;
