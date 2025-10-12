#!/usr/bin/env node

/**
 * Generate Apple JWT token for Supabase Apple Sign-In
 *
 * This script creates a JWT token that Supabase can use to validate Apple Sign-In requests.
 * The JWT contains the necessary claims and is signed with your Apple private key.
 */

const fs = require("fs");
const crypto = require("crypto");

// Check if required arguments are provided
if (process.argv.length < 5) {
  console.error("❌ Missing required arguments!\n");
  console.log("Usage:");
  console.log(
    "  node scripts/generate-apple-jwt.js <p8-file> <team-id> <key-id> <client-id>\n"
  );
  console.log("Example:");
  console.log(
    "  node scripts/generate-apple-jwt.js ./AuthKey_3C28KWQL6Y.p8 499MRF25LG 3C28KWQL6Y com.rhoodapp.mobile\n"
  );
  process.exit(1);
}

const p8FilePath = process.argv[2];
const teamId = process.argv[3];
const keyId = process.argv[4];
const clientId = process.argv[5];

console.log("\n🍎 Apple Sign-In JWT Generator for Supabase\n");
console.log("═══════════════════════════════════════════════════════════\n");

// Validate file exists
if (!fs.existsSync(p8FilePath)) {
  console.error(`❌ Error: File not found: ${p8FilePath}\n`);
  process.exit(1);
}

// Validate inputs
if (!/^[A-Z0-9]{10}$/.test(teamId)) {
  console.error(`❌ Error: Invalid Team ID format: ${teamId}\n`);
  process.exit(1);
}

if (!/^[A-Z0-9]{10}$/.test(keyId)) {
  console.error(`❌ Error: Invalid Key ID format: ${keyId}\n`);
  process.exit(1);
}

try {
  // Read the .p8 file
  console.log("📖 Reading .p8 file...");
  const p8Content = fs.readFileSync(p8FilePath, "utf8");

  if (
    !p8Content.includes("BEGIN PRIVATE KEY") ||
    !p8Content.includes("END PRIVATE KEY")
  ) {
    console.error(
      "❌ Error: File does not appear to be a valid .p8 private key file\n"
    );
    process.exit(1);
  }

  console.log("✅ .p8 file read successfully\n");

  // Create JWT header
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 6 * 30 * 24 * 60 * 60, // 6 months from now
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  // Create the signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Create sign object
  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);

  // Sign with the private key
  const signature = sign.sign(p8Content, "base64url");

  // Create the final JWT
  const jwt = `${signingInput}.${signature}`;

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("📋 Configuration Summary:\n");
  console.log(`Team ID:    ${teamId}`);
  console.log(`Key ID:     ${keyId}`);
  console.log(`Client ID:  ${clientId}`);
  console.log(`Expires:    ${new Date(payload.exp * 1000).toISOString()}\n`);

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("🔐 JWT TOKEN (for Supabase Secret Key field):\n");
  console.log("Copy this ENTIRE token (it's very long):\n");
  console.log("─────────────────────────────────────────────────────────\n");
  console.log(jwt);
  console.log("─────────────────────────────────────────────────────────\n");

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("📝 Next Steps:\n");
  console.log("1. Go to Supabase Dashboard:");
  console.log(
    "   https://supabase.com/dashboard/project/jsmcduecuxtaqizhmiqo/auth/providers\n"
  );
  console.log('2. Click on "Apple" provider\n');
  console.log("3. Fill in the fields:");
  console.log(`   - Client IDs: ${clientId}`);
  console.log(`   - Secret Key: (paste the JWT token above)\n`);
  console.log('4. Click "Save"\n');
  console.log("5. Test Apple Sign-In in your app! 🎉\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Save to file
  const outputFile = "apple-jwt-token.txt";
  const outputContent = `Apple Sign-In JWT Token for Supabase
═══════════════════════════════════════════════════════════

Team ID: ${teamId}
Key ID: ${keyId}
Client ID: ${clientId}
Expires: ${new Date(payload.exp * 1000).toISOString()}

JWT Token (paste this into Supabase Secret Key field):
${jwt}

═══════════════════════════════════════════════════════════
⚠️  SECURITY WARNING: This file contains sensitive credentials!
    - Do NOT commit this file to GitHub
    - Delete this file after adding to Supabase
    - This JWT expires in 6 months
═══════════════════════════════════════════════════════════
`;

  fs.writeFileSync(outputFile, outputContent);
  console.log(`💾 JWT token saved to: ${outputFile}`);
  console.log("   (Remember to delete this file after use!)\n");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
