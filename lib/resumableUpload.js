/**
 * Resumable (TUS) uploads to Supabase Storage for slow or unreliable networks.
 *
 * The file goes up in 6 MB pieces (Supabase requires exactly 6 MB). If a piece
 * fails, we wait, ask the server how much it already has (HEAD), and carry on
 * from there — a dropped connection costs at most one piece, not the whole file.
 * An unfinished upload is remembered for this app session, so tapping Upload
 * again with the same file resumes instead of restarting. Upload URLs live 24h.
 */
import * as FileSystem from "expo-file-system/legacy";
import { FileSystemUploadType, FileSystemSessionType } from "expo-file-system/legacy";
import { supabase } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/supabaseConfig";

export const RESUMABLE_CHUNK_BYTES = 6 * 1024 * 1024;

const TUS_ENDPOINT = `${SUPABASE_URL}/storage/v1/upload/resumable`;
const TUS_VERSION = "1.0.0";
/** Waits between attempts after a stall; resets whenever a piece succeeds (~4 min total). */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000, 30000, 30000, 30000, 30000];
const UPLOAD_URL_TTL_MS = 23 * 60 * 60 * 1000;

/** bucket|fileUri|size → { uploadUrl, path, createdAt } for resuming within this session. */
const pendingUploads = new Map();

class UploadHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** UTF-8 → base64 without relying on btoa/TextEncoder being present. */
function encodeMetadataValue(value) {
  const bytes = [];
  for (const char of String(value)) {
    const code = char.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63)
      );
    }
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    out += BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64_ALPHABET[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64_ALPHABET[n & 63] : "=";
  }
  return out;
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === wanted);
  return key ? headers[key] : null;
}

async function accessToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new UploadHttpError(401, "Session unavailable. Please log in and try again.");
  }
  if ((session.expires_at ?? 0) - Math.floor(Date.now() / 1000) < 300) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed?.session?.access_token) {
      throw new UploadHttpError(401, "Session expired. Please log in again.");
    }
    return refreshed.session.access_token;
  }
  return session.access_token;
}

async function baseHeaders() {
  return {
    Authorization: `Bearer ${await accessToken()}`,
    apikey: SUPABASE_ANON_KEY,
    "Tus-Resumable": TUS_VERSION,
  };
}

function friendlyStatusMessage(status, body) {
  if (status === 413) return "This file is too large to upload.";
  if (status === 403) return "You don't have permission to upload here.";
  try {
    const parsed = JSON.parse(body || "{}");
    return parsed.message || parsed.error || `Upload failed (HTTP ${status})`;
  } catch (_) {
    return (body && String(body).trim()) || `Upload failed (HTTP ${status})`;
  }
}

/** Network drops, timeouts and server hiccups are worth retrying; 4xx content errors are not. */
function isRetryable(error) {
  if (error?.localFailure) return false;
  const status = error?.status;
  if (status == null) return true;
  return status === 401 || status === 408 || status === 409 || status === 423 || status === 429 || status >= 500;
}

async function createUpload({ bucket, path, contentType, size, upsert }) {
  const res = await fetch(TUS_ENDPOINT, {
    method: "POST",
    headers: {
      ...(await baseHeaders()),
      "Upload-Length": String(size),
      "Upload-Metadata": [
        `bucketName ${encodeMetadataValue(bucket)}`,
        `objectName ${encodeMetadataValue(path)}`,
        `contentType ${encodeMetadataValue(contentType || "application/octet-stream")}`,
        `cacheControl ${encodeMetadataValue("3600")}`,
      ].join(","),
      "x-upsert": upsert ? "true" : "false",
    },
  });
  if (res.status !== 201) {
    throw new UploadHttpError(res.status, friendlyStatusMessage(res.status, await res.text()));
  }
  const location = headerValue(res.headers, "location");
  if (!location) throw new UploadHttpError(500, "Upload could not be started. Please try again.");
  return location.startsWith("http") ? location : `${SUPABASE_URL}${location}`;
}

async function serverOffset(uploadUrl) {
  const res = await fetch(uploadUrl, { method: "HEAD", headers: await baseHeaders() });
  if (res.status !== 200 && res.status !== 204) {
    throw new UploadHttpError(res.status, `Upload could not be resumed (HTTP ${res.status}).`);
  }
  return Number(headerValue(res.headers, "upload-offset")) || 0;
}

async function sendPiece({ uploadUrl, fileUri, offset, length, onBytes }) {
  const pieceUri = `${FileSystem.cacheDirectory}upload-piece-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.bin`;
  try {
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length,
      });
      await FileSystem.writeAsStringAsync(pieceUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readError) {
      // Reading the file on the phone failed — retrying won't help.
      readError.localFailure = true;
      throw readError;
    }
    const task = FileSystem.createUploadTask(
      uploadUrl,
      pieceUri,
      {
        httpMethod: "PATCH",
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: {
          ...(await baseHeaders()),
          "Upload-Offset": String(offset),
          "Content-Type": "application/offset+octet-stream",
        },
        sessionType: FileSystemSessionType.FOREGROUND,
      },
      (progress) => onBytes?.(progress.totalBytesSent || 0)
    );
    const result = await task.uploadAsync();
    if (!result) throw new UploadHttpError(null, "The network connection was lost.");
    if (result.status !== 204 && result.status !== 200) {
      throw new UploadHttpError(result.status, friendlyStatusMessage(result.status, result.body));
    }
    return Number(headerValue(result.headers, "upload-offset")) || offset + length;
  } finally {
    FileSystem.deleteAsync(pieceUri, { idempotent: true }).catch(() => {});
  }
}

/**
 * Whether the classic single-request upload is worth trying after a resumable
 * failure: the phone couldn't read file pieces, no piece was ever accepted, or
 * the server rejected the resumable request for a reason the classic path may
 * not share. Permission, size and conflict errors would fail the same way.
 */
export function shouldFallBackToSingleRequest(error) {
  if (error?.localFailure) return true;
  const status = error?.status;
  if (status != null && [401, 403, 409, 413].includes(status)) return false;
  if (status != null && status >= 400 && status < 500) return true;
  return Boolean(error?.neverStarted);
}

/**
 * Upload a local file with resume-on-failure. Returns the object path actually
 * used — when resuming an earlier unfinished upload of the same file, that
 * upload's path is kept so the pieces already sent are not wasted.
 *
 * @param {{ bucket: string, path: string, fileUri: string, contentType?: string,
 *   upsert?: boolean, onProgress?: (fraction: number) => void }} opts
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadFileResumable({
  bucket,
  path,
  fileUri,
  contentType,
  upsert = false,
  onProgress,
}) {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info?.exists || !info.size) {
    throw new UploadHttpError(400, "The selected file is empty or missing. Please choose it again.");
  }
  const size = info.size;
  const key = `${bucket}|${fileUri}|${size}`;

  let pending = pendingUploads.get(key);
  if (pending && Date.now() - pending.createdAt > UPLOAD_URL_TTL_MS) {
    pendingUploads.delete(key);
    pending = null;
  }
  let objectPath = pending?.path || path;
  let uploadUrl = pending?.uploadUrl || null;
  let offset = 0;
  let failures = 0;
  let recreated = false;
  let anyPieceAccepted = Boolean(pending);

  const report = (sent) => {
    if (typeof onProgress === "function") onProgress(Math.min(1, sent / size));
  };

  while (true) {
    try {
      if (!uploadUrl) {
        uploadUrl = await createUpload({ bucket, path: objectPath, contentType, size, upsert });
        pendingUploads.set(key, { uploadUrl, path: objectPath, createdAt: Date.now() });
        offset = 0;
      } else if (failures > 0 || pending) {
        offset = await serverOffset(uploadUrl);
        pending = null;
      }
      report(offset);

      while (offset < size) {
        const length = Math.min(RESUMABLE_CHUNK_BYTES, size - offset);
        const start = offset;
        offset = await sendPiece({
          uploadUrl,
          fileUri,
          offset: start,
          length,
          onBytes: (sent) => report(start + sent),
        });
        failures = 0;
        anyPieceAccepted = true;
        report(offset);
      }

      pendingUploads.delete(key);
      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      return { path: objectPath, publicUrl: data.publicUrl };
    } catch (error) {
      // Upload URL expired or vanished: start a fresh one once.
      if ((error?.status === 404 || error?.status === 410) && uploadUrl && !recreated) {
        recreated = true;
        uploadUrl = null;
        pendingUploads.delete(key);
        objectPath = path;
        continue;
      }
      if (!isRetryable(error) || failures >= RETRY_DELAYS_MS.length) {
        if (!isRetryable(error)) pendingUploads.delete(key);
        error.neverStarted = !anyPieceAccepted;
        throw error;
      }
      if (__DEV__) {
        console.warn(`⚠️ Upload stalled (attempt ${failures + 1}) — retrying:`, error?.message);
      }
      await sleep(RETRY_DELAYS_MS[failures]);
      failures += 1;
    }
  }
}
