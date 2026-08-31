-- Migration: Add fixed rules and headers to projects, and mismatch flag to spreadsheets

ALTER TABLE public.projects
ADD COLUMN fixed_rules_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN fixed_headers TEXT;

ALTER TABLE public.spreadsheets
ADD COLUMN mismatch_flag BOOLEAN DEFAULT FALSE;
