#!/usr/bin/env node

/**
 * Convert Apple .p8 private key to JWT secret for Supabase
 * 
 * Usage:
 *   node scripts/convert-apple-key-to-jwt.js <path-to-p8-file> <team-id> <key-id>
 * 
 * Example:
 *   node scripts/convert-apple-key-to-jwt.js ./AuthKey_AB12CD34EF.p8 ABC1234DEF AB12CD34EF
 */

const fs = require('fs');
const path = require('path');

// Check if required arguments are provided
if (process.argv.length < 5) {
  console.error('❌ Missing required arguments!\n');
  console.log('Usage:');
  console.log('  node scripts/convert-apple-key-to-jwt.js <p8-file> <team-id> <key-id>\n');
  console.log('Example:');
  console.log('  node scripts/convert-apple-key-to-jwt.js ./AuthKey_AB12CD34EF.p8 ABC1234DEF AB12CD34EF\n');
  console.log('Arguments:');
  console.log('  <p8-file>  - Path to your .p8 private key file from Apple');
  console.log('  <team-id>  - Your Apple Developer Team ID (10 characters)');
  console.log('  <key-id>   - Your Apple Sign in Key ID (10 characters)');
  process.exit(1);
}

const p8FilePath = process.argv[2];
const teamId = process.argv[3];
const keyId = process.argv[4];

console.log('\n🍎 Apple Sign in with Apple - Key Converter\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Validate file exists
if (!fs.existsSync(p8FilePath)) {
  console.error(`❌ Error: File not found: ${p8FilePath}\n`);
  console.log('Make sure you:');
  console.log('1. Downloaded the .p8 file from Apple Developer Console');
  console.log('2. Saved it to your project directory');
  console.log('3. Provided the correct path to the file\n');
  process.exit(1);
}

// Validate Team ID format (10 alphanumeric characters)
if (!/^[A-Z0-9]{10}$/.test(teamId)) {
  console.error(`❌ Error: Invalid Team ID format: ${teamId}\n`);
  console.log('Team ID should be:');
  console.log('- Exactly 10 characters');
  console.log('- Uppercase letters and numbers only');
  console.log('- Example: ABC1234DEF\n');
  console.log('Find your Team ID at: https://developer.apple.com/account\n');
  process.exit(1);
}

// Validate Key ID format (10 alphanumeric characters)
if (!/^[A-Z0-9]{10}$/.test(keyId)) {
  console.error(`❌ Error: Invalid Key ID format: ${keyId}\n`);
  console.log('Key ID should be:');
  console.log('- Exactly 10 characters');
  console.log('- Uppercase letters and numbers only');
  console.log('- Example: AB12CD34EF\n');
  console.log('Find your Key ID in Apple Developer Console when you created the key\n');
  process.exit(1);
}

try {
  // Read the .p8 file
  console.log('📖 Reading .p8 file...');
  const p8Content = fs.readFileSync(p8FilePath, 'utf8');
  
  // Validate it's a proper .p8 file
  if (!p8Content.includes('BEGIN PRIVATE KEY') || !p8Content.includes('END PRIVATE KEY')) {
    console.error('❌ Error: File does not appear to be a valid .p8 private key file\n');
    console.log('The file should contain:');
    console.log('-----BEGIN PRIVATE KEY-----');
    console.log('...base64 encoded key...');
    console.log('-----END PRIVATE KEY-----\n');
    process.exit(1);
  }

  console.log('✅ .p8 file read successfully\n');
  
  // Display the information
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Your Apple Sign in with Apple Configuration:\n');
  console.log(`Team ID:  ${teamId}`);
  console.log(`Key ID:   ${keyId}`);
  console.log(`P8 File:  ${path.basename(p8FilePath)}\n`);
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🔐 SECRET KEY (for Supabase):\n');
  console.log('Copy the ENTIRE content below (including BEGIN and END lines):\n');
  console.log('─────────────────────────────────────────────────────────\n');
  console.log(p8Content);
  console.log('─────────────────────────────────────────────────────────\n');
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📝 Next Steps:\n');
  console.log('1. Go to Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/jsmcduecuxtaqizhmiqo/auth/providers\n');
  console.log('2. Click on "Apple" provider\n');
  console.log('3. Fill in the fields:');
  console.log(`   - Client IDs: com.rhoodapp.mobile.signin`);
  console.log(`   - Team ID: ${teamId}`);
  console.log(`   - Key ID: ${keyId}`);
  console.log('   - Secret Key: (paste the content above)\n');
  console.log('4. Click "Save"\n');
  console.log('5. Test Apple Sign-In in your app! 🎉\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Save to a temporary file for easy copying
  const outputFile = path.join(__dirname, '..', 'apple-secret-key.txt');
  const outputContent = `Apple Sign in with Apple Configuration
═══════════════════════════════════════════════════════════

Team ID: ${teamId}
Key ID: ${keyId}
Client IDs: com.rhoodapp.mobile.signin

Secret Key (paste this into Supabase):
${p8Content}

═══════════════════════════════════════════════════════════
⚠️  SECURITY WARNING: This file contains sensitive credentials!
    - Do NOT commit this file to GitHub
    - Delete this file after adding to Supabase
    - Keep your .p8 file secure
═══════════════════════════════════════════════════════════
`;
  
  fs.writeFileSync(outputFile, outputContent);
  console.log(`💾 Configuration saved to: ${outputFile}`);
  console.log('   (Remember to delete this file after use!)\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

