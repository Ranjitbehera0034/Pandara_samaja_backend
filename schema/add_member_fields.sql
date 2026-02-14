-- Migration: Add additional member fields
-- Date: 2026-02-14
-- Description: Add aadhar_no, family_members (JSONB), and address columns to members table

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS aadhar_no    VARCHAR(12),
  ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS address       TEXT;

-- Optional: Index on aadhar_no for lookups
CREATE INDEX IF NOT EXISTS idx_members_aadhar_no ON public.members(aadhar_no);

COMMENT ON COLUMN public.members.aadhar_no IS 'Aadhaar number of head of family (12 digits)';
COMMENT ON COLUMN public.members.family_members IS 'JSON array of family members: [{name, relation, age}, ...]';
COMMENT ON COLUMN public.members.address IS 'Full address of the member';
