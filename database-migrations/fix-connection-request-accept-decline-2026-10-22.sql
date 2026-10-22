-- Harden connection request / accept / re-request.
-- Decline from the app was broken (wrote non-existent connection_status).
-- Accept allowed the initiator to accept their own pending request.
-- Re-request after reject was a no-op (returned the old rejected row).

CREATE OR REPLACE FUNCTION public.create_connection_request(
  target_user_id uuid,
  requester_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  connection_id UUID;
  existing_status TEXT;
  ordered_user_1 UUID;
  ordered_user_2 UUID;
BEGIN
  IF requester_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF target_user_id IS NULL OR target_user_id = requester_user_id THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;

  IF requester_user_id < target_user_id THEN
    ordered_user_1 := requester_user_id;
    ordered_user_2 := target_user_id;
  ELSE
    ordered_user_1 := target_user_id;
    ordered_user_2 := requester_user_id;
  END IF;

  SELECT id, status::text
  INTO connection_id, existing_status
  FROM public.connections
  WHERE user_id_1 = ordered_user_1
    AND user_id_2 = ordered_user_2;

  IF connection_id IS NOT NULL THEN
    IF lower(COALESCE(existing_status, '')) IN ('rejected', 'declined', 'cancelled', 'canceled') THEN
      UPDATE public.connections
      SET status = 'pending',
          initiated_by = requester_user_id,
          accepted_at = NULL,
          updated_at = NOW()
      WHERE id = connection_id;

      -- INSERT trigger won't fire on reopen — notify the recipient explicitly.
      INSERT INTO public.notifications (user_id, title, message, type, related_id, is_read, metadata)
      SELECT
        target_user_id,
        'Connection Request',
        COALESCE(up.dj_name, 'Someone') || ' wants to connect with you',
        'connection_request',
        connection_id,
        false,
        jsonb_build_object(
          'approved_promoter',
          COALESCE(up.is_rhood_approved_promoter, false)
        )
      FROM public.user_profiles up
      WHERE up.id = requester_user_id;
    END IF;
    RETURN connection_id;
  END IF;

  INSERT INTO public.connections (user_id_1, user_id_2, status, initiated_by)
  VALUES (ordered_user_1, ordered_user_2, 'pending', requester_user_id)
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_connection_request(
  connection_id uuid,
  accepter_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  connection_record RECORD;
BEGIN
  IF accepter_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO connection_record
  FROM public.connections
  WHERE id = connection_id
    AND (user_id_1 = accepter_user_id OR user_id_2 = accepter_user_id)
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Only the recipient may accept — not the person who sent the request.
  IF connection_record.initiated_by = accepter_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own connection request';
  END IF;

  UPDATE public.connections
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = connection_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_connection_request(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_connection_request(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_connection_request(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_connection_request(uuid, uuid) TO authenticated;
