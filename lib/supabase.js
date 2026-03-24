/**
 * App data layer: re-exports the Supabase client, auth helpers, and `db` API.
 * Implementation lives in `lib/supabase/` (client, auth, db).
 */
export { supabase, getRedirectUrl } from "./supabase/supabaseClient";
export { auth } from "./supabase/authService";
export { db } from "./supabase/db";
