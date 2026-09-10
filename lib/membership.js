export function normalizeMembershipStatus(raw) {
  const status = String(raw || "").toLowerCase().trim();
  if (status === "pending" || status === "rejected" || status === "approved") {
    return status;
  }
  return "approved";
}

export function membershipFromRedeemResult(data) {
  if (data && typeof data === "object" && data.ok === true) {
    return "approved";
  }
  return null;
}

export function isMissingRpcError(error, fnName) {
  const msg = String(error?.message || "");
  return (
    error?.code === "PGRST202" ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the function") ||
    (fnName ? msg.includes(fnName) : false)
  );
}

export function isMissingColumnError(error) {
  const msg = String(error?.message || "");
  return error?.code === "42703" || msg.includes("does not exist");
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
