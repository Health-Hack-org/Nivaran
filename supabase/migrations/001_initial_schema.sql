-- ====================================================================
-- NIVARAN Recovery & Mind-Growth Platform Database Schema
-- Migration: 001_initial_schema.sql
-- ====================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    age INT NOT NULL CHECK (age >= 10 AND age <= 120),
    height_cm NUMERIC(5,2) NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')) DEFAULT 'light',
    active_track TEXT CHECK (active_track IN ('sm', 'sa', 'gm', 'jf')) DEFAULT 'sm',
    medical_flags TEXT[] DEFAULT '{}',
    medical_notes TEXT DEFAULT '',
    dietary_preference TEXT DEFAULT 'vegetarian',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. TRACK PROGRESS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.track_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    track TEXT CHECK (track IN ('sm', 'sa', 'gm', 'jf')) NOT NULL,
    current_day INT DEFAULT 1 NOT NULL,
    streak INT DEFAULT 0 NOT NULL,
    shields INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_track_progress_user_track UNIQUE (user_id, track)
);

-- ====================================================================
-- 3. DAILY PRESCRIPTIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.daily_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    track TEXT CHECK (track IN ('sm', 'sa', 'gm', 'jf')) NOT NULL,
    day_number INT NOT NULL,
    phase INT CHECK (phase BETWEEN 1 AND 4) NOT NULL,
    special_mission TEXT NOT NULL,
    routine_tasks JSONB NOT NULL,
    diet_protocol JSONB NOT NULL,
    exercise_protocol JSONB NOT NULL,
    mental_protocol JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_daily_prescriptions_user_track_day UNIQUE (user_id, track, day_number)
);

-- ====================================================================
-- 4. DAILY LOGS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    track TEXT CHECK (track IN ('sm', 'sa', 'gm', 'jf')) NOT NULL,
    day_number INT NOT NULL,
    tasks_completed JSONB NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_daily_logs_user_track_day UNIQUE (user_id, track, day_number)
);

-- ====================================================================
-- 5. URGE LOGS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.urge_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    track TEXT CHECK (track IN ('sm', 'sa', 'gm', 'jf')) NOT NULL,
    intensity INT CHECK (intensity BETWEEN 1 AND 10) NOT NULL,
    trigger_type TEXT NOT NULL,
    notes TEXT,
    surfed_successfully BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_track_progress_user_track ON public.track_progress(user_id, track);
CREATE INDEX IF NOT EXISTS idx_daily_prescriptions_lookup ON public.daily_prescriptions(user_id, track, day_number);
CREATE INDEX IF NOT EXISTS idx_daily_logs_lookup ON public.daily_logs(user_id, track, day_number);
CREATE INDEX IF NOT EXISTS idx_urge_logs_user ON public.urge_logs(user_id, track);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow authenticated and anonymous users to check username existence during onboarding/registration
CREATE POLICY "Allow public username check"
    ON public.profiles
    FOR SELECT
    USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Track Progress RLS
ALTER TABLE public.track_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own track_progress"
    ON public.track_progress
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own track_progress"
    ON public.track_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own track_progress"
    ON public.track_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own track_progress"
    ON public.track_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Daily Prescriptions RLS
ALTER TABLE public.daily_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own daily_prescriptions"
    ON public.daily_prescriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_prescriptions"
    ON public.daily_prescriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_prescriptions"
    ON public.daily_prescriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_prescriptions"
    ON public.daily_prescriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Daily Logs RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own daily_logs"
    ON public.daily_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_logs"
    ON public.daily_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_logs"
    ON public.daily_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_logs"
    ON public.daily_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Urge Logs RLS
ALTER TABLE public.urge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own urge_logs"
    ON public.urge_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own urge_logs"
    ON public.urge_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own urge_logs"
    ON public.urge_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own urge_logs"
    ON public.urge_logs
    FOR DELETE
    USING (auth.uid() = user_id);
