export function normalizeMembershipStatus(raw) {
  const status = String(raw || "").toLowerCase().trim();
  if (status === "pending" || status === "rejected" || status === "approved") {
    return status;
  }
  return "approved";
}

export function membershipStatusFromProfile(profileOrStatus) {
  if (profileOrStatus && typeof profileOrStatus === "object") {
    if (
      profileOrStatus.is_verified === true &&
      String(profileOrStatus.membership_status || "").toLowerCase() !== "rejected"
    ) {
      return "approved";
    }
    return normalizeMembershipStatus(profileOrStatus.membership_status);
  }
  return normalizeMembershipStatus(profileOrStatus);
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
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    msg.includes("does not exist") ||
    /could not find .*column/i.test(msg)
  );
}

export function isMembershipApproved(profileOrStatus) {
  return membershipStatusFromProfile(profileOrStatus) === "approved";
}

export function isMembershipPending(profileOrStatus) {
  return membershipStatusFromProfile(profileOrStatus) === "pending";
}

export function isMembershipRejected(profileOrStatus) {
  return membershipStatusFromProfile(profileOrStatus) === "rejected";
}
