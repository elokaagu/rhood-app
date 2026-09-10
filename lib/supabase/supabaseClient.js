/**
 * Supabase JS client + OAuth redirect helper (PKCE, AsyncStorage).
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig";

WebBrowser.maybeCompleteAuthSession();

const expoGlobal = typeof globalThis !== "undefined" ? globalThis.expo : undefined;
const isExpoGo =
  typeof expoGlobal !== "undefined" && expoGlobal?.Constants?.appOwnership === "expo";

const NATIVE_AUTH_REDIRECT = "rhoodapp://auth/callback";

export const getRedirectUrl = () => {
  // Standalone / TestFlight / production must never call makeRedirectUri.
  // expo-linking throws "no custom scheme defined" when appOwnership is null
  // (bare workflow) and `useProxy` is no longer valid in expo-auth-session 7.
  if (!isExpoGo) {
    return NATIVE_AUTH_REDIRECT;
  }

  try {
    return AuthSession.makeRedirectUri({
      scheme: "rhoodapp",
      path: "auth/callback",
      native: NATIVE_AUTH_REDIRECT,
    });
  } catch {
    return NATIVE_AUTH_REDIRECT;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
  global: {
    headers: {
      "x-client-info": "supabase-js-react-native",
    },
  },
});
