/**
 * Optional hook for native Google Sign-In (@react-native-google-signin/google-signin).
 * This app primarily uses Supabase OAuth + expo-web-browser (see lib/supabase.js).
 * No-op implementation so App.js can require this module without errors.
 */
function configureGoogleSignIn() {
  // Wire native SDK here if you add @react-native-google-signin/google-signin.
}

module.exports = { configureGoogleSignIn };
