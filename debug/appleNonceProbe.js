// debug/appleNonceProbe.js
// Diagnostic probe for Apple Sign-In nonce validation
// This bypasses the Supabase SDK and hits GoTrue REST directly
// to show exactly what the server receives and processes.

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Alert } from 'react-native';

const PROJECT_REF = 'jsmcduecuxtaqizhmiqo';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso';
const BUNDLE_ID = 'com.rhoodapp.mobile';

function b64url(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64url(input) {
  const b64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return b64url(b64);
}

async function makeHexNonce(lenBytes = 32) {
  const bytes = await Crypto.getRandomBytesAsync(lenBytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Base64url decode helper
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return atob(s + '='.repeat(pad));
}

export async function appleNonceProbe() {
  try {
    // 1) Generate nonce (toggle between fixed and random for testing)
    // const rawNonce = 'abc123-TEST-nonce-ONLY-for-debug'; // Fixed for control test
    const rawNonce = await makeHexNonce(32); // Random for real test

    if (!/^[0-9a-f]{64}$/.test(rawNonce)) {
      Alert.alert('Nonce format error', 'Expected 64 hex chars');
      return;
    }

    const hashedNonce = await sha256Base64url(rawNonce);

    // 2) Apple prompt with HASHED nonce
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!cred.identityToken) {
      Alert.alert('Apple error', 'No identityToken returned');
      return;
    }

    // 3) Decode token, check claims locally
    const [, payload] = cred.identityToken.split('.');
    const claims = JSON.parse(b64urlDecode(payload));
    
    const audOk = claims.aud === BUNDLE_ID;
    const issOk = claims.iss === 'https://appleid.apple.com';
    const nonceOk = claims.nonce === hashedNonce;

    // Show essential local checks
    Alert.alert(
      'Local checks',
      [
        `rawNonce len: ${rawNonce.length}`,
        `rawNonce preview: ${rawNonce.slice(0, 6)}...${rawNonce.slice(-6)}`,
        `hashed len: ${hashedNonce.length}`,
        `hashed preview: ${hashedNonce.slice(0, 6)}...${hashedNonce.slice(-6)}`,
        `audOk:${audOk} issOk:${issOk} nonceOk:${nonceOk}`,
      ].join('\n')
    );

    // 4) Call Supabase GoTrue REST directly (bypasses SDK)
    const url = `https://${PROJECT_REF}.supabase.co/auth/v1/token?grant_type=id_token`;
    const body = {
      provider: 'apple',
      id_token: cred.identityToken,
      nonce: rawNonce, // RAW nonce — must be the same exact string we hashed
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    // 5) Show server result
    Alert.alert(
      `GoTrue REST ${res.status}`,
      // keep it short to avoid Alert truncation
      JSON.stringify(
        {
          status: res.status,
          hasSession: !!json?.access_token || !!json?.token || !!json?.session,
          error: json?.error || json?.error_description || null,
          msg: json?.msg || json?.message || null,
        },
        null,
        2
      )
    );

    // If successful, log the full response for debugging
    if (res.status === 200) {
      console.log('✅ Apple Sign-In Probe SUCCESS:', {
        hasUser: !!json?.user,
        hasSession: !!json?.session,
        email: json?.user?.email,
      });
    } else {
      console.log('❌ Apple Sign-In Probe FAILED:', json);
    }
  } catch (e) {
    Alert.alert('Probe error', String(e?.message || e));
    console.error('❌ Apple Sign-In Probe error:', e);
  }
}

