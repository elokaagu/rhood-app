/**
 * App Tracking Transparency.
 *
 * R/HOOD does not track users across other companies' apps or websites for
 * advertising (Apple's ATT definition). Mixpanel/Firebase are first-party
 * product analytics. Prompting ATT while declaring NSPrivacyTracking=false
 * is a Guideline 5.1.2 rejection risk, so we never show the system dialog.
 */
export async function requestAppTrackingIfNeeded() {
  return true;
}
