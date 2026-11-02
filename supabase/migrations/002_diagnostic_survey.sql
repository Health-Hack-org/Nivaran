-- ====================================================================
-- NIVARAN Migration: 002_diagnostic_survey.sql
-- Add clinical diagnostic survey columns and dynamic recovery duration
-- ====================================================================

ALTER TABLE public.track_progress
  ADD COLUMN IF NOT EXISTS severity_score NUMERIC(3,1) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS severity_level TEXT DEFAULT 'moderate' CHECK (severity_level IN ('minor', 'moderate', 'severe')),
  ADD COLUMN IF NOT EXISTS target_days INT DEFAULT 28,
  ADD COLUMN IF NOT EXISTS survey_responses JSONB DEFAULT '[]'::jsonb;

