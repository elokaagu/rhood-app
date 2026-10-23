-- Never let a mix point at a 0-byte artwork file in the `mixes` bucket.
-- The app checks for empty files before uploading, but skips the check when
-- the phone can't read the file's details. This closes that gap server-side.
--   • Edit: keep the previous artwork so the rest of the edit still saves.
--   • New mix: reject, so the uploader picks the image again.
-- URLs that aren't in the bucket, or whose object can't be found, are allowed.

CREATE OR REPLACE FUNCTION public.mix_artwork_is_empty_file(url text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  object_path text;
  object_size text;
BEGIN
  IF url IS NULL OR btrim(url) = '' THEN
    RETURN false;
  END IF;

  object_path := substring(
    split_part(url, '?', 1)
    FROM '/storage/v1/object/public/mixes/(.+)$'
  );
  IF object_path IS NULL THEN
    RETURN false;
  END IF;

  SELECT o.metadata->>'size'
  INTO object_size
  FROM storage.objects o
  WHERE o.bucket_id = 'mixes'
    AND o.name = object_path;

  RETURN object_size IS NOT NULL AND object_size = '0';
END;
$$;

REVOKE ALL ON FUNCTION public.mix_artwork_is_empty_file(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_empty_mix_artwork()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF public.mix_artwork_is_empty_file(NEW.artwork_url)
       OR public.mix_artwork_is_empty_file(NEW.image_url) THEN
      RAISE EXCEPTION 'The artwork image uploaded empty. Please choose the image again.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.artwork_url IS DISTINCT FROM OLD.artwork_url
     AND public.mix_artwork_is_empty_file(NEW.artwork_url) THEN
    NEW.artwork_url := OLD.artwork_url;
  END IF;

  IF NEW.image_url IS DISTINCT FROM OLD.image_url
     AND public.mix_artwork_is_empty_file(NEW.image_url) THEN
    NEW.image_url := OLD.image_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_empty_mix_artwork ON public.mixes;
CREATE TRIGGER trg_guard_empty_mix_artwork
  BEFORE INSERT OR UPDATE OF artwork_url, image_url ON public.mixes
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_empty_mix_artwork();
