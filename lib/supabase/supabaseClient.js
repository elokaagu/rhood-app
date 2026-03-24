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

export const getRedirectUrl = () => {
  if (isExpoGo || (typeof __DEV__ !== "undefined" && __DEV__)) {
    return AuthSession.makeRedirectUri({
      scheme: "rhoodapp",
      path: "auth/callback",
    });
  }

  return AuthSession.makeRedirectUri({
    scheme: "rhoodapp",
    path: "auth/callback",
    useProxy: false,
  });
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
