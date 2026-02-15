-- Migration: Add head_gender field to members
-- Date: 2026-02-16
-- Description: Add head_gender column to track gender of the head of family.
--              The male/female counts now include the head of family.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS head_gender VARCHAR(10);

COMMENT ON COLUMN public.members.head_gender IS 'Gender of the head of family (Male/Female/Other). Included in male/female counts.';
