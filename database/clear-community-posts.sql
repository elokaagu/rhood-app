-- 🧹 Clear Community Chat History
-- Run this in the Supabase SQL editor to wipe all community/group chat data.
-- This script deletes rows from both the canonical `community_posts` table and the
-- legacy `group_messages` table to ensure there is a single source of truth.

BEGIN;

  -- Show counts before deletion
  SELECT '=== CURRENT GROUP CHAT COUNTS ===' AS status;
  SELECT COUNT(*) AS community_posts_count FROM community_posts;
  SELECT COUNT(*) AS group_messages_legacy_count FROM group_messages;

  -- Delete everything (order matters because of foreign keys referencing community_posts)
  DELETE FROM community_posts;
  DELETE FROM group_messages;

  -- Confirm cleanup
  SELECT '=== REMAINING GROUP CHAT COUNTS ===' AS status;
  SELECT COUNT(*) AS community_posts_count FROM community_posts;
  SELECT COUNT(*) AS group_messages_legacy_count FROM group_messages;

COMMIT;

