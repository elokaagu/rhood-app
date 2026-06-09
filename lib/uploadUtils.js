/**
 * Shared upload utilities used across the app.
 *
 * Centralises the three main reliability concerns:
 *  1. Session freshness  — ensureFreshToken() refreshes if <5 min remain
 *  2. Streaming upload   — uploadFileStreaming() never loads the file into RAM
 *  3. Retry on flakiness — withRetry() handles transient network errors
 *  4. File pre-flight    — guardFileSizeBytes() checks existence + cap
 */

import * as FileSystem from "expo-file-system";
// Named imports are required: in Hermes production builds the namespace-accessed
// versions (FileSystem.FileSystemUploadType etc.) are undefined at runtime.
import { FileSystemUploadType, FileSystemSessionType } from "expo-file-system";
import { supabase } from "./supabase";
import { SUPABASE_URL } from "./supabase/supabaseConfig";

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Returns a valid access token, refreshing the session if it expires within
 * 5 minutes. Throws a user-friendly error if unauthenticated.
 */
export async function ensureFreshToken() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Session unavailable. Please log in and try again.");
  }

  // expires_at is a Unix timestamp in seconds
  const expiresAt = session.expires_at ?? 0;
  const nowSecs = Math.floor(Date.now() / 1000);

  if (expiresAt - nowSecs < 300) {
    // Token expires within 5 minutes — refresh proactively
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError || !refreshed?.session?.access_token) {
      throw new Error("Session expired. Please log in again.");
    }
    return refreshed.session.access_token;
  }

  return session.access_token;
}

// ─── Streaming upload ──────────────────────────────────────────────────────────

/**
 * Upload a local file URI to Supabase Storage without loading it into RAM.
 *
 * Uses expo-file-system's `createUploadTask` which streams bytes from disk
 * through the native iOS/Android networking layer — safe for any file size.
 *
 * @param {{
 *   bucket: string,
 *   path: string,
 *   fileUri: string,
 *   contentType: string,
 *   upsert?: boolean,
 *   onProgress?: (fraction: number) => void
 * }} opts
 * @returns {Promise<string>} Supabase public URL for the uploaded object
 */
export async function uploadFileStreaming({
  bucket,
  path,
  fileUri,
  contentType,
  upsert = false,
  onProgress,
}) {
  const token = await ensureFreshToken();
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIPath(path)}`;

  const task = FileSystem.createUploadTask(
    uploadUrl,
    fileUri,
    {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": upsert ? "true" : "false",
        "cache-control": "3600",
      },
      sessionType: FileSystemSessionType.FOREGROUND,
    },
    (progress) => {
      if (
        typeof onProgress === "function" &&
        progress.totalBytesExpectedToSend > 0
      ) {
        onProgress(
          progress.totalBytesSent / progress.totalBytesExpectedToSend
        );
      }
    }
  );

  const result = await task.uploadAsync();

  if (!result || result.status < 200 || result.status >= 300) {
    let msg = `Upload failed (HTTP ${result?.status ?? "unknown"})`;
    try {
      const body = JSON.parse(result?.body || "{}");
      msg = body.message || body.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

// ─── Retry ────────────────────────────────────────────────────────────────────

/**
 * Calls fn up to maxAttempts times, retrying only on network / timeout errors.
 * Uses linear back-off: waits delayMs × attempt before each retry.
 *
 * @param {() => Promise<T>} fn
 * @param {{ maxAttempts?: number, delayMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, { maxAttempts = 3, delayMs = 1200 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Only retry on network / connectivity problems, not content errors.
      const isNetworkError =
        !err?.message?.match(/HTTP (4\d\d)/) && // not a 4xx — don't retry those
        (err?.message?.includes("Network request failed") ||
          err?.message?.includes("network") ||
          err?.message?.includes("timed out") ||
          err?.message?.includes("ETIMEDOUT") ||
          err?.message?.includes("ECONNRESET") ||
          err?.message?.includes("Upload failed (HTTP 5")); // 5xx are retryable

      if (!isNetworkError || attempt === maxAttempts) break;

      if (__DEV__) {
        console.warn(
          `⚠️ Upload attempt ${attempt}/${maxAttempts} failed — retrying in ${
            delayMs * attempt
          }ms:`,
          err.message
        );
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  throw lastError;
}

// ─── File pre-flight ──────────────────────────────────────────────────────────

/**
 * Verifies that a local file URI still exists and is within the size cap.
 * Returns the file size in bytes. Throws user-friendly errors on failure.
 *
 * @param {string} fileUri       Local URI from expo-image-picker / DocumentPicker
 * @param {number} maxBytes      Maximum allowed byte count
 * @param {string} [label]       Human label used in error messages (e.g. "Profile photo")
 * @returns {Promise<number|null>} Size in bytes, or null if size could not be determined
 */
export async function guardFileSizeBytes(fileUri, maxBytes, label = "File") {
  try {
    const info = await FileSystem.getInfoAsync(fileUri, { size: true });
    if (!info.exists) {
      throw new Error(
        `${label} could not be found. Please select it again.`
      );
    }
    if (info.size && info.size > maxBytes) {
      const mb = (maxBytes / 1024 / 1024).toFixed(0);
      throw new Error(
        `${label} is too large (${(info.size / 1024 / 1024).toFixed(1)} MB). ` +
          `Please use a file under ${mb} MB.`
      );
    }
    return info.size ?? null;
  } catch (err) {
    // Re-throw our own errors; silently swallow FileSystem inspection errors
    // so upload can proceed and surface the real error from the server.
    if (
      err.message.includes("too large") ||
      err.message.includes("could not be found")
    ) {
      throw err;
    }
    if (__DEV__) console.warn("⚠️ Could not check file size:", err.message);
    return null;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Encodes each path segment individually, preserving forward slashes.
 * Supabase Storage paths like "user123/artwork/my file.jpg" need the
 * spaces encoded but the slashes kept.
 */
function encodeURIPath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Sanitize a filename for safe use in a Supabase Storage path.
 * Replaces spaces and special characters; keeps the extension.
 */
export function sanitizeFileName(name) {
  if (!name || typeof name !== "string") return `file_${Date.now()}`;
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
  const base = parts
    .join("_")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  return ext ? `${base}.${ext}` : base;
}
