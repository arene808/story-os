-- ============================================================
-- Story OS — Migration 0001: Add missing branch_type column
--
-- The Drizzle schema defines branches.branch_type but the
-- initial migration (0000) was missing this column.
--
-- Values: 'mainline' | 'side_story' | 'what_if' | 'alternative_ending'
-- Default: 'mainline'
-- ============================================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS branch_type TEXT DEFAULT 'mainline';

-- Add CHECK constraint for valid branch types
ALTER TABLE branches
  ADD CONSTRAINT chk_branches_type
  CHECK (branch_type IN ('mainline', 'side_story', 'what_if', 'alternative_ending'));

-- Update existing rows to 'mainline' if NULL (safe migration)
UPDATE branches SET branch_type = 'mainline' WHERE branch_type IS NULL;
