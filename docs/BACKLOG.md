# Backlog

Ideas and follow-ups that are parked, not scheduled. Newest first.

## Waiting on a decision

### Upload mixes from a laptop (web upload page) — logged 29 Oct 2026
DJs have asked to upload mixes from their laptops. Today the only path is moving
the file to the phone (AirDrop / iCloud Drive / Google Drive → Files) and uploading
in the app.

Option: a web page where DJs sign in with their R/HOOD account and upload a mix
plus artwork with the same fields as the app. Reuses existing pieces: Supabase
auth, the `mixes` storage policy (owner folder) and insert rules, and resumable
(TUS) uploads, which work well in browsers. Roughly 1–2 days.

Open questions:
- Where it lives: inside Studio (same database, already a web app) or a
  standalone page on rhood.io.
- WAV files: the app converts WAV to AAC on the phone; a browser can't easily.
  Either accept MP3 only on web, or add a server-side conversion step.

### New App Store build — logged 29 Oct 2026
New installs start on the App Store bundle (pre–20 Oct) for their whole first
session; OTA updates only apply on the next cold start, and the apply-on-launch
logic only exists in OTA bundles. A fresh build embeds current JS and makes
future OTAs apply on first launch. No code change needed.

## Follow-ups for Studio
- Show DJs' brand ratings (`gigs.venue_rating`) to the brand and admins.
- Some Studio notification inserts fail (likely a type not in
  `notifications_type_check`).
- Consider replacing the open `opportunities_select_all` read policy with
  narrower rules (the DJ app still needs: own pending submissions, closed
  listings in application history, listings shared in DMs).

## Smaller items
- Create Opportunity form still writes "Experience level" enums into
  `skill_level`; Studio now uses it as free-text "Requirements".
- Sentry DSN (`EXPO_PUBLIC_SENTRY_DSN`) appears unset, so upload and other
  client errors aren't reported anywhere we can see.
