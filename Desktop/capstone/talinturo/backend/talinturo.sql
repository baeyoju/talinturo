--
-- PostgreSQL database dump
--

\restrict LitNKR0MLYiBd95j88moMm6rzaJ1zL1ZFaYRxtacc5egbEjbekhd6FKFp4aRizX

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-11-03 11:56:28

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16517)
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id bigint NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16516)
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.achievements ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.achievements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 16625)
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id bigint NOT NULL,
    lesson_id bigint,
    slug text NOT NULL,
    activity_type text NOT NULL,
    title text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    CONSTRAINT activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['practice'::text, 'quiz'::text, 'scenario'::text, 'vocabulary'::text])))
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16624)
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.activities ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 237 (class 1259 OID 16670)
-- Name: activity_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_attempts (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    user_id bigint NOT NULL,
    classroom_id bigint,
    score smallint,
    status text DEFAULT 'in_progress'::text NOT NULL,
    response jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT activity_attempts_check CHECK ((((status = 'completed'::text) AND (completed_at IS NOT NULL)) OR (status <> 'completed'::text))),
    CONSTRAINT activity_attempts_score_check CHECK (((score >= 0) AND (score <= 100))),
    CONSTRAINT activity_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])))
);


ALTER TABLE public.activity_attempts OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16669)
-- Name: activity_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 16443)
-- Name: classroom_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_memberships (
    id bigint NOT NULL,
    classroom_id bigint NOT NULL,
    user_id bigint,
    invited_name character varying(70),
    invited_email text,
    status text DEFAULT 'invited'::text NOT NULL,
    joined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT classroom_memberships_check CHECK (((user_id IS NOT NULL) OR (invited_email IS NOT NULL))),
    CONSTRAINT classroom_memberships_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'removed'::text])))
);


ALTER TABLE public.classroom_memberships OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16442)
-- Name: classroom_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.classroom_memberships ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.classroom_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 16418)
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id bigint NOT NULL,
    instructor_id bigint NOT NULL,
    name character varying(60) NOT NULL,
    description character varying(240) DEFAULT ''::character varying NOT NULL,
    invite_code character varying(16) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16417)
-- Name: classrooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.classrooms ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.classrooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 229 (class 1259 OID 16574)
-- Name: learning_paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learning_paths (
    id bigint NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    level text DEFAULT 'Beginner'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.learning_paths OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16573)
-- Name: learning_paths_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.learning_paths ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.learning_paths_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 238 (class 1259 OID 16704)
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_progress (
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    progress_percent smallint DEFAULT 0 NOT NULL,
    best_score smallint,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lesson_progress_best_score_check CHECK (((best_score >= 0) AND (best_score <= 100))),
    CONSTRAINT lesson_progress_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100))),
    CONSTRAINT lesson_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))
);


ALTER TABLE public.lesson_progress OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16599)
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id bigint NOT NULL,
    path_id bigint NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    duration_minutes integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    CONSTRAINT lessons_duration_minutes_check CHECK (((duration_minutes IS NULL) OR (duration_minutes > 0)))
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16598)
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.lessons ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 227 (class 1259 OID 16533)
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_achievements (
    user_id bigint NOT NULL,
    achievement_id bigint NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_achievements OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16397)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(70) NOT NULL,
    email text NOT NULL,
    password_salt bytea,
    password_hash bytea,
    role text DEFAULT 'learner'::text NOT NULL,
    learner_type text,
    learning_goal text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_check CHECK (((password_salt IS NULL) = (password_hash IS NULL))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['learner'::text, 'instructor'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16396)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 235 (class 1259 OID 16651)
-- Name: vocabulary_signs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vocabulary_signs (
    id bigint NOT NULL,
    slug text NOT NULL,
    word text NOT NULL,
    meaning text NOT NULL,
    category text NOT NULL,
    hint text DEFAULT ''::text NOT NULL,
    media_url text,
    is_published boolean DEFAULT false NOT NULL
);


ALTER TABLE public.vocabulary_signs OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16650)
-- Name: vocabulary_signs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.vocabulary_signs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vocabulary_signs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5152 (class 0 OID 16517)
-- Dependencies: 226
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievements (id, slug, title, description, criteria) FROM stdin;
\.


--
-- TOC entry 5159 (class 0 OID 16625)
-- Dependencies: 233
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, lesson_id, slug, activity_type, title, content, sort_order, is_published) FROM stdin;
\.


--
-- TOC entry 5163 (class 0 OID 16670)
-- Dependencies: 237
-- Data for Name: activity_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_attempts (id, activity_id, user_id, classroom_id, score, status, response, started_at, completed_at) FROM stdin;
\.


--
-- TOC entry 5150 (class 0 OID 16443)
-- Dependencies: 224
-- Data for Name: classroom_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classroom_memberships (id, classroom_id, user_id, invited_name, invited_email, status, joined_at, created_at) FROM stdin;
\.


--
-- TOC entry 5148 (class 0 OID 16418)
-- Dependencies: 222
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classrooms (id, instructor_id, name, description, invite_code, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5155 (class 0 OID 16574)
-- Dependencies: 229
-- Data for Name: learning_paths; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.learning_paths (id, slug, title, description, level, sort_order, is_published, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5164 (class 0 OID 16704)
-- Dependencies: 238
-- Data for Name: lesson_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_progress (user_id, lesson_id, status, progress_percent, best_score, started_at, completed_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5157 (class 0 OID 16599)
-- Dependencies: 231
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons (id, path_id, slug, title, description, duration_minutes, sort_order, is_published) FROM stdin;
\.


--
-- TOC entry 5153 (class 0 OID 16533)
-- Dependencies: 227
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_achievements (user_id, achievement_id, earned_at) FROM stdin;
\.


--
-- TOC entry 5146 (class 0 OID 16397)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_salt, password_hash, role, learner_type, learning_goal, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5161 (class 0 OID 16651)
-- Dependencies: 235
-- Data for Name: vocabulary_signs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vocabulary_signs (id, slug, word, meaning, category, hint, media_url, is_published) FROM stdin;
\.


--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 225
-- Name: achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.achievements_id_seq', 1, false);


--
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 232
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 1, false);


--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 236
-- Name: activity_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_attempts_id_seq', 1, false);


--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 223
-- Name: classroom_memberships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classroom_memberships_id_seq', 1, false);


--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 221
-- Name: classrooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classrooms_id_seq', 1, false);


--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 228
-- Name: learning_paths_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.learning_paths_id_seq', 1, false);


--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 230
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lessons_id_seq', 1, false);


--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 234
-- Name: vocabulary_signs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vocabulary_signs_id_seq', 1, false);


--
-- TOC entry 4959 (class 2606 OID 16530)
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 16532)
-- Name: achievements achievements_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_slug_key UNIQUE (slug);


--
-- TOC entry 4973 (class 2606 OID 16642)
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- TOC entry 4975 (class 2606 OID 16644)
-- Name: activities activities_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_slug_key UNIQUE (slug);


--
-- TOC entry 4981 (class 2606 OID 16688)
-- Name: activity_attempts activity_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_attempts
    ADD CONSTRAINT activity_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 4956 (class 2606 OID 16457)
-- Name: classroom_memberships classroom_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_pkey PRIMARY KEY (id);


--
-- TOC entry 4952 (class 2606 OID 16436)
-- Name: classrooms classrooms_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_invite_code_key UNIQUE (invite_code);


--
-- TOC entry 4954 (class 2606 OID 16434)
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 16595)
-- Name: learning_paths learning_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_pkey PRIMARY KEY (id);


--
-- TOC entry 4967 (class 2606 OID 16597)
-- Name: learning_paths learning_paths_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_slug_key UNIQUE (slug);


--
-- TOC entry 4985 (class 2606 OID 16721)
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (user_id, lesson_id);


--
-- TOC entry 4969 (class 2606 OID 16616)
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 2606 OID 16618)
-- Name: lessons lessons_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_slug_key UNIQUE (slug);


--
-- TOC entry 4963 (class 2606 OID 16541)
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id);


--
-- TOC entry 4950 (class 2606 OID 16416)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4977 (class 2606 OID 16666)
-- Name: vocabulary_signs vocabulary_signs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vocabulary_signs
    ADD CONSTRAINT vocabulary_signs_pkey PRIMARY KEY (id);


--
-- TOC entry 4979 (class 2606 OID 16668)
-- Name: vocabulary_signs vocabulary_signs_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vocabulary_signs
    ADD CONSTRAINT vocabulary_signs_slug_key UNIQUE (slug);


--
-- TOC entry 4982 (class 1259 OID 16733)
-- Name: attempts_activity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX attempts_activity_idx ON public.activity_attempts USING btree (activity_id);


--
-- TOC entry 4983 (class 1259 OID 16732)
-- Name: attempts_user_completed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX attempts_user_completed_idx ON public.activity_attempts USING btree (user_id, completed_at DESC);


--
-- TOC entry 4957 (class 1259 OID 16552)
-- Name: memberships_invite_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX memberships_invite_email_unique ON public.classroom_memberships USING btree (classroom_id, lower(invited_email)) WHERE ((invited_email IS NOT NULL) AND (user_id IS NULL));


--
-- TOC entry 4992 (class 2606 OID 16645)
-- Name: activities activities_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- TOC entry 4993 (class 2606 OID 16689)
-- Name: activity_attempts activity_attempts_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_attempts
    ADD CONSTRAINT activity_attempts_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- TOC entry 4994 (class 2606 OID 16699)
-- Name: activity_attempts activity_attempts_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_attempts
    ADD CONSTRAINT activity_attempts_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE SET NULL;


--
-- TOC entry 4995 (class 2606 OID 16694)
-- Name: activity_attempts activity_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_attempts
    ADD CONSTRAINT activity_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4987 (class 2606 OID 16458)
-- Name: classroom_memberships classroom_memberships_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4988 (class 2606 OID 16463)
-- Name: classroom_memberships classroom_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4986 (class 2606 OID 16437)
-- Name: classrooms classrooms_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- TOC entry 4996 (class 2606 OID 16727)
-- Name: lesson_progress lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- TOC entry 4997 (class 2606 OID 16722)
-- Name: lesson_progress lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4991 (class 2606 OID 16619)
-- Name: lessons lessons_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;


--
-- TOC entry 4989 (class 2606 OID 16547)
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- TOC entry 4990 (class 2606 OID 16542)
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-11-03 11:56:28

--
-- PostgreSQL database dump complete
--

\unrestrict LitNKR0MLYiBd95j88moMm6rzaJ1zL1ZFaYRxtacc5egbEjbekhd6FKFp4aRizX

