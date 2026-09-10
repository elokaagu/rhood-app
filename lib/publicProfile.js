/**
 * Strip contact fields unless the owner opted in.
 * Used by getUserProfilePublic so other users never receive hidden email/phone.
 */
export function sanitizePublicProfile(row) {
  if (!row) return row;
  return {
    ...row,
    email: row.show_email ? row.email || null : null,
    phone: row.show_phone ? row.phone || null : null,
  };
}
