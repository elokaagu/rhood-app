-- ============================================================================
-- DELETE FAKE/TEST USERS
-- This script removes all fake test users from the database
-- Only keeps real user accounts (Eloka)
-- IMPORTANT: Order matters - delete child records before parent records
-- ============================================================================

-- Delete from message_threads_participant (references user_profiles)
DELETE FROM message_threads_participant
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111', -- Maya Chen
  '22222222-2222-2222-2222-222222222222', -- DJ Smooth
  '33333333-3333-3333-3333-333333333333', -- Aisha T
  '44444444-4444-4444-4444-444444444444', -- Luca Romano
  '55555555-5555-5555-5555-555555555555', -- Sophie A
  '66666666-6666-6666-6666-666666666666', -- DJ Marcus
  '77777777-7777-7777-7777-777777777777', -- Yasmin Patel
  '88888888-8888-8888-8888-888888888888', -- Olly T
  '99999999-9999-9999-9999-999999999999', -- Fatima H
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Connor OB
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Nina R
  'cccccccc-cccc-cccc-cccc-cccccccccccc'  -- Ben Clarke
);

-- Delete from message_threads where creator is fake user
DELETE FROM message_threads
WHERE created_by IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Delete fake users from user_profiles table
DELETE FROM user_profiles
WHERE id IN (
  '11111111-1111-1111-1111-111111111111', -- Maya Chen
  '22222222-2222-2222-2222-222222222222', -- DJ Smooth
  '33333333-3333-3333-3333-333333333333', -- Aisha T
  '44444444-4444-4444-4444-444444444444', -- Luca Romano
  '55555555-5555-5555-5555-555555555555', -- Sophie A
  '66666666-6666-6666-6666-666666666666', -- DJ Marcus
  '77777777-7777-7777-7777-777777777777', -- Yasmin Patel
  '88888888-8888-8888-8888-888888888888', -- Olly T
  '99999999-9999-9999-9999-999999999999', -- Fatima H
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Connor OB
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Nina R
  'cccccccc-cccc-cccc-cccc-cccccccccccc'  -- Ben Clarke
);

-- Delete any connections involving fake users
DELETE FROM connections
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
)
OR connected_user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Delete any messages involving fake users
DELETE FROM messages
WHERE sender_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
)
OR receiver_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Delete any applications involving fake users
DELETE FROM applications
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Delete any mixes owned by fake users
DELETE FROM mixes
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script removes:
-- - 12 fake user profiles
-- - All their connections
-- - All their messages
-- - All their applications
-- - All their mixes
--
-- Keeps real users:
-- - Eloka Agu (64ee29a2-dfd1-4c0a-824a-81b15398ff32)
-- - Eloka/Google (dfee6a12-a337-46f9-8bf0-307b4262f60f)
-- ============================================================================

