/**
 * Account-level helpers shared across discovery/connections services.
 */
export function isBrandAccount(email) {
  if (!email || typeof email !== "string") return false;
  const emailLower = email.toLowerCase();
  const brandPatterns = [
    /^team@/i,
    /^support@/i,
    /^info@/i,
    /^admin@/i,
    /^contact@/i,
    /^hello@/i,
    /^noreply@/i,
    /^no-reply@/i,
  ];
  return brandPatterns.some((pattern) => pattern.test(emailLower));
}
