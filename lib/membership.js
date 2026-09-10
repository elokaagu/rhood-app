export function normalizeMembershipStatus(raw) {
  const status = String(raw || "").toLowerCase().trim();
  if (status === "pending" || status === "rejected" || status === "approved") {
    return status;
  }
  return "approved";
}

export function isMembershipApproved(profileOrStatus) {
  const raw =
    typeof profileOrStatus === "string" || profileOrStatus == null
      ? profileOrStatus
      : profileOrStatus.membership_status;
  return normalizeMembershipStatus(raw) === "approved";
}

export function isMembershipPending(profileOrStatus) {
  const raw =
    typeof profileOrStatus === "string" || profileOrStatus == null
      ? profileOrStatus
      : profileOrStatus.membership_status;
  return normalizeMembershipStatus(raw) === "pending";
}

export function isMembershipRejected(profileOrStatus) {
  const raw =
    typeof profileOrStatus === "string" || profileOrStatus == null
      ? profileOrStatus
      : profileOrStatus.membership_status;
  return normalizeMembershipStatus(raw) === "rejected";
}
