/**
 * Mix upload orchestration (storage + DB + primary mix).
 * Keeps UploadMixScreen focused on form UI; progress values are milestone-based UX, not byte-accurate.
 */

import * as FileSystem from "expo-file-system";
// Named imports are required: in Hermes production builds the namespace-accessed
// versions (FileSystem.FileSystemUploadType etc.) are undefined at runtime.
import { FileSystemUploadType, FileSystemSessionType } from "expo-file-system";
import { supabase } from "./supabase";
import { SUPABASE_URL } from "./supabase/supabaseConfig";
import { extensionFromName, guessMimeFromExtension } from "./multimediaUtils";
import { ensureFreshToken, uploadFileStreaming, withRetry, guardFileSizeBytes } from "./uploadUtils";

const MIXES_BUCKET = "mixes";
// No hard duration cap — accept full DJ sets of any length.
const VALID_AUDIO_EXT = ["mp3", "wav"];

export function slugify(value) {
  if (!value) return "untitled-mix";
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled-mix"
  );
}

/**
 * Sync validation before any network I/O.
 * @returns {{ ok: true } | { ok: false, title: string, message: string }}
 */
export function validateMixSubmission({
  editingMix,
  selectedFile,
  selectedArtwork,
  mixData,
  userId,
}) {
  if (!editingMix && !selectedFile) {
    return {
      ok: false,
      title: "No File Selected",
      message: "Please select an audio file to upload",
    };
  }
  if (!mixData.title?.trim()) {
    return {
      ok: false,
      title: "Title Required",
      message: "Please enter a title for your mix",
    };
  }
  if (!editingMix && !selectedArtwork) {
    return {
      ok: false,
      title: "Artwork Required",
      message: "Please select artwork for your mix before uploading.",
    };
  }
  if (!userId) {
    return {
      ok: false,
      title: "Error",
      message: "You must be logged in to upload mixes",
    };
  }
  const genres = Array.isArray(mixData.genres) ? mixData.genres : [];
  if (genres.length < 3) {
    return {
      ok: false,
      title: "More Genres Needed",
      message: `Please select at least 3 genres for your mix (${genres.length}/3 selected).`,
    };
  }
  return { ok: true };
}

export function getAudioFileExtension(selectedFile, editingMix) {
  if (selectedFile?.name) {
    return selectedFile.name.split(".").pop().toLowerCase();
  }
  if (editingMix) {
    const existing =
      editingMix.file_name || editingMix.file_url || "";
    if (existing) {
      return existing.split(".").pop()?.toLowerCase() || "mp3";
    }
  }
  return null;
}

export async function resolveAudioDurationMillis({
  selectedFile,
  selectedFileDuration,
  Audio,
}) {
  let effective = selectedFileDuration;
  if (
    (!effective || effective === 0) &&
    Audio?.Sound?.createAsync &&
    selectedFile
  ) {
    try {
      const uri = selectedFile.uri || selectedFile.fileCopyUri;
      if (!uri) return { durationMillis: effective, error: null };
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      if (status.isLoaded && status.durationMillis) {
        effective = status.durationMillis;
      }
    } catch (e) {
      console.warn("⚠️ Unable to confirm mix duration:", e);
    }
  }
  return { durationMillis: effective, error: null };
}

export async function readRemoteFileAsUint8Array(uri) {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Streams an audio file directly from disk to Supabase Storage using
 * expo-file-system's native upload path — no full-file read into RAM.
 * Safe for files of any size (300 MB, 1 GB, etc.).
 *
 * How it works (mirrors SoundCloud/Spotify):
 *  1. The file stays on disk the entire time.
 *  2. iOS/Android networking layer reads it in chunks and streams to S3.
 *  3. onProgress fires with 0→1 as bytes are sent.
 *  4. Supabase Storage (S3-backed) stores the file; the returned publicUrl
 *     supports HTTP Range requests so expo-av can seek/stream without
 *     downloading the whole file first.
 *
 * @param {{ fileUri: string, fileName: string, contentType: string, onProgress?: (fraction: number) => void }} opts
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadAudioFileStreaming({ fileUri, fileName, contentType, onProgress }) {
  // Pre-flight: make sure the file still exists before starting a potentially
  // long upload. Large mixes can sit in the picker's temp dir for minutes.
  await guardFileSizeBytes(fileUri, Infinity, "Mix file");

  // ensureFreshToken() refreshes the session if <5 minutes remain so a slow
  // upload on a flaky connection doesn't hit a mid-flight 401.
  const token = await ensureFreshToken();
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${MIXES_BUCKET}/${fileName}`;

  const task = FileSystem.createUploadTask(
    uploadUrl,
    fileUri,
    {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType || "audio/mpeg",
        "x-upsert": "false",
        "cache-control": "3600",
      },
      sessionType: FileSystemSessionType.FOREGROUND,
    },
    (progress) => {
      if (typeof onProgress === "function" && progress.totalBytesExpectedToSend > 0) {
        onProgress(progress.totalBytesSent / progress.totalBytesExpectedToSend);
      }
    }
  );

  const result = await task.uploadAsync();

  if (!result || result.status < 200 || result.status >= 300) {
    let errMsg = `Upload failed (HTTP ${result?.status ?? "unknown"})`;
    try {
      const body = JSON.parse(result?.body || "{}");
      errMsg = body.message || body.error || errMsg;
    } catch (_) {}
    throw mapStorageUploadError({ message: errMsg });
  }

  const { data: urlData } = supabase.storage.from(MIXES_BUCKET).getPublicUrl(fileName);
  return { path: fileName, publicUrl: urlData.publicUrl };
}

/**
 * Storage (and S3-compatible APIs) require a real MIME type. Expo ImagePicker
 * often sets `type` to the word "image", which triggers "Invalid Content-Type".
 */
function normalizeArtworkContentType(raw, fileName) {
  const candidate =
    typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (candidate.startsWith("image/") && candidate.length > 7) {
    return raw.trim();
  }
  const fromName = guessMimeFromExtension(extensionFromName(fileName));
  if (fromName) {
    return fromName;
  }
  return "image/jpeg";
}

/** Unified artwork bytes + content-type from picker-shaped object */
export async function readArtworkPayload(selectedArtwork) {
  const uri = selectedArtwork.uri || selectedArtwork.fileCopyUri;
  if (!uri) {
    throw new Error("Artwork URI not found");
  }
  const data = await readRemoteFileAsUint8Array(uri);
  const fileName =
    selectedArtwork.name ||
    selectedArtwork.fileName ||
    selectedArtwork.filename ||
    "";
  const rawHint =
    selectedArtwork.mimeType ||
    (typeof selectedArtwork.type === "string" &&
    selectedArtwork.type.includes("/")
      ? selectedArtwork.type
      : null);
  const contentType = normalizeArtworkContentType(rawHint || "", fileName);
  return { data, contentType };
}

function mapStorageUploadError(uploadError, context = {}) {
  const msg = uploadError?.message || "";
  const sizeBytes = context.sizeBytes ?? context.size;
  if (
    msg.includes("exceeded maximum size") ||
    msg.includes("too large") ||
    msg.includes("file size limit") ||
    msg.includes("Object exceeded maximum size")
  ) {
    const fileSizeMB = sizeBytes
      ? (sizeBytes / 1024 / 1024).toFixed(2)
      : "?";
    return new Error(
      `File too large: ${fileSizeMB}MB.\n\n` +
        `The storage bucket may have a lower limit configured.\n\n` +
        `To fix this:\n` +
        `1. Go to Supabase Dashboard > Storage > mixes bucket\n` +
        `2. Click Settings and update "File size limit" to 5120 MB (5GB)\n` +
        `3. Try uploading again\n\n` +
        `Or check: database/check-and-fix-mixes-bucket-limit.sql`
    );
  }
  if (msg.includes("quota")) {
    return new Error(
      "Storage quota exceeded. Please delete some old mixes or contact support."
    );
  }
  return new Error(`Upload failed: ${msg || "Unknown error"}`);
}

/**
 * @deprecated — loads the entire file into RAM. Use uploadAudioFileStreaming instead.
 * Kept for any external callers that haven't migrated yet.
 */
export async function uploadAudioBytes({ fileName, fileData, contentType }) {
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(MIXES_BUCKET)
    .upload(fileName, fileData, {
      contentType: contentType || "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) {
    throw mapStorageUploadError(uploadError, { sizeBytes: fileData?.length });
  }
  const { data: url } = supabase.storage.from(MIXES_BUCKET).getPublicUrl(fileName);
  return { path: uploadData.path, publicUrl: url.publicUrl };
}

/**
 * Stream artwork from disk to Supabase Storage — never loads full image into RAM.
 * Retries up to 3 times on transient network errors.
 */
export async function uploadArtworkStreaming({ selectedArtwork, artworkFileName }) {
  const uri = selectedArtwork.uri || selectedArtwork.fileCopyUri;
  if (!uri) {
    throw new Error("Artwork URI not found. Please select the image again.");
  }

  // Guard file existence and apply a generous 20 MB cap
  await guardFileSizeBytes(uri, 20 * 1024 * 1024, "Artwork image");

  const artworkSourceName =
    selectedArtwork.name ||
    selectedArtwork.fileName ||
    selectedArtwork.filename ||
    "";
  const rawHint =
    selectedArtwork.mimeType ||
    (typeof selectedArtwork.type === "string" && selectedArtwork.type.includes("/")
      ? selectedArtwork.type
      : null);
  const contentType = normalizeArtworkContentType(rawHint || "", artworkSourceName);

  const publicUrl = await withRetry(() =>
    uploadFileStreaming({
      bucket: MIXES_BUCKET,
      path: artworkFileName,
      fileUri: uri,
      contentType,
      upsert: false,
    })
  );

  if (!publicUrl?.trim()) {
    throw new Error("Artwork was uploaded but the public URL is invalid.");
  }
  return { path: artworkFileName, publicUrl };
}

/**
 * @deprecated — loads the full image into RAM. Use uploadArtworkStreaming instead.
 */
export async function uploadArtworkBytes({ artworkFileName, artworkData, contentType }) {
  const safeContentType = normalizeArtworkContentType(contentType || "", artworkFileName);
  const { data: uploadData, error: artworkUploadError } = await supabase.storage
    .from(MIXES_BUCKET)
    .upload(artworkFileName, artworkData, {
      contentType: safeContentType,
      cacheControl: "3600",
      upsert: false,
    });
  if (artworkUploadError) {
    throw new Error(
      `Failed to upload artwork: ${artworkUploadError.message}. Please try again or select a different image.`
    );
  }
  const { data: artworkUrlData } = supabase.storage.from(MIXES_BUCKET).getPublicUrl(artworkFileName);
  const publicUrl = artworkUrlData.publicUrl;
  if (!publicUrl?.trim()) throw new Error("Artwork was uploaded but the URL is invalid.");
  return { path: uploadData?.path || artworkFileName, publicUrl };
}

export async function fetchArtistName(userId) {
  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, dj_name, first_name, last_name")
    .eq("id", userId)
    .single();

  if (profileError || !userProfile) {
    throw new Error(
      "User profile not found. Please complete your profile first."
    );
  }

  const artistName =
    userProfile.dj_name ||
    `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() ||
    "Unknown Artist";

  return { userProfile, artistName };
}

/**
 * After DB failure: best-effort remove uploaded objects.
 */
export async function cleanupFailedUpload({ fileName, artworkPath }) {
  if (fileName) {
    try {
      await supabase.storage.from(MIXES_BUCKET).remove([fileName]);
    } catch (e) {
      console.error("Cleanup error (audio):", e);
    }
  }
  if (artworkPath) {
    try {
      await supabase.storage.from(MIXES_BUCKET).remove([artworkPath]);
    } catch (e) {
      console.error("Cleanup error (artwork):", e);
    }
  }
}

/**
 * Single primary-mix write: new uploads only, when the user toggle is on.
 * (Avoids duplicate setPrimaryMix + mutating React state for messaging.)
 */
export async function applyPrimaryMixIfRequested({
  db,
  userId,
  editingMix,
  mixRecord,
  userWantsPrimary,
}) {
  if (!mixRecord || editingMix || !userWantsPrimary) {
    return { becamePrimary: false, error: null };
  }
  try {
    const updatedProfile = await db.setPrimaryMix(userId, mixRecord.id);
    if (!updatedProfile || updatedProfile.primary_mix_id !== mixRecord.id) {
      console.warn(
        "⚠️ primary_mix_id may not have been set correctly",
        mixRecord.id,
        updatedProfile?.primary_mix_id
      );
    }
    return { becamePrimary: true, error: null };
  } catch (e) {
    console.error("❌ Error setting primary mix:", e);
    return { becamePrimary: false, error: e };
  }
}

/**
 * Full upload pipeline. Does not show Alerts — caller handles UX.
 * @param {object} params
 * @param {function} params.onProgress - milestone 0–100 (UX only)
 * @param {function} [params.onDurationResolved]
 */
export async function uploadMixSubmission({
  db,
  user,
  editingMix,
  selectedFile,
  selectedArtwork,
  selectedFileDuration,
  mixData,
  Audio,
  onProgress,
  onDurationResolved,
}) {
  const userId = user?.id;
  const setProg = typeof onProgress === "function" ? onProgress : () => {};

  const validation = validateMixSubmission({
    editingMix,
    selectedFile,
    selectedArtwork,
    mixData,
    userId,
  });
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.alertTitle = validation.title;
    throw err;
  }

  const fileExt = getAudioFileExtension(selectedFile, editingMix);

  if (selectedFile) {
    if (!VALID_AUDIO_EXT.includes(fileExt)) {
      const err = new Error("Please select an MP3 or WAV audio file only.");
      err.alertTitle = "Invalid Format";
      throw err;
    }
  }

  setProg(0);

  let effectiveDurationMillis = selectedFileDuration;
  if (selectedFile) {
    const { durationMillis } = await resolveAudioDurationMillis({
      selectedFile,
      selectedFileDuration,
      Audio,
    });
    effectiveDurationMillis = durationMillis;
    if (
      durationMillis &&
      durationMillis !== selectedFileDuration &&
      typeof onDurationResolved === "function"
    ) {
      onDurationResolved(durationMillis);
    }

    // No duration cap — full DJ sets welcome.
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(6);
  let fileName = null;
  let urlData = null;

  if (selectedFile) {
    const mixSlug = slugify(mixData.title || selectedFile.name);
    fileName = `${userId}/audio/${timestamp}_${mixSlug}_${randomStr}.${fileExt}`;

    setProg(10);
    const fileUri = selectedFile.uri || selectedFile.fileCopyUri;
    if (!fileUri) {
      throw new Error("File URI not found. Please try selecting the file again.");
    }

    setProg(20);

    // Stream directly from disk — no full-file read into RAM.
    // Safe for 300 MB+ files; progress drives setProg from 20 → 40.
    urlData = await uploadAudioFileStreaming({
      fileUri,
      fileName,
      contentType: selectedFile.mimeType || "audio/mpeg",
      onProgress: (fraction) => setProg(20 + Math.round(fraction * 20)),
    });

    setProg(40);
  } else if (editingMix) {
    urlData = { publicUrl: editingMix.file_url };
    setProg(40);
  }

  setProg(60);

  let artworkUrl = null;
  let uploadedArtworkPath = null;

  if (selectedArtwork) {
    const artworkSourceName =
      selectedArtwork.name ||
      selectedArtwork.fileName ||
      selectedArtwork.uri ||
      "artwork";
    const rawArtworkExt = artworkSourceName.includes(".")
      ? artworkSourceName.split(".").pop()
      : "jpg";
    const safeArtworkExt =
      rawArtworkExt?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const mixSlug = slugify(
      mixData.title ||
        selectedFile?.name ||
        editingMix?.title ||
        "mix"
    );
    const artworkFileName = `${userId}/artwork/${timestamp}_${mixSlug}_${randomStr}.${safeArtworkExt}`;

    // Stream artwork from disk — never loads the image into RAM
    const artworkUpload = await uploadArtworkStreaming({
      selectedArtwork,
      artworkFileName,
    });
    artworkUrl = artworkUpload.publicUrl;
    uploadedArtworkPath = artworkUpload.path;
  }

  const { userProfile, artistName } = await fetchArtistName(userId);

  const updateData = {
    title: mixData.title.trim(),
    description: mixData.description.trim() || null,
    genre: Array.isArray(mixData.genres) && mixData.genres.length > 0
      ? mixData.genres.join(",")
      : (mixData.genre || "Electronic"),
    is_public: mixData.isPublic,
    is_pinned: mixData.isPinned || false,
  };

  if (effectiveDurationMillis) {
    updateData.duration = Math.round(effectiveDurationMillis / 1000);
  } else if (editingMix?.duration) {
    updateData.duration = editingMix.duration;
  }

  if (selectedFile && urlData) {
    updateData.file_name = selectedFile.name;
    updateData.file_url = urlData.publicUrl;
    updateData.file_size = selectedFile.size;
  }

  if (artworkUrl) {
    updateData.artwork_url = artworkUrl;
  } else if (editingMix && !selectedArtwork) {
    const existingArtwork = editingMix.artwork_url;
    if (existingArtwork) {
      updateData.artwork_url = existingArtwork;
    }
  }

  setProg(80);

  let mixRecord;
  let dbError;

  if (editingMix) {
    const { data, error } = await supabase
      .from("mixes")
      .update(updateData)
      .eq("id", editingMix.id)
      .eq("user_id", userProfile.id)
      .select()
      .single();

    mixRecord = data;
    dbError = error;
  } else {
    if (!selectedFile || !urlData) {
      throw new Error("File upload failed. Please try again.");
    }

    const finalArtworkUrl = updateData.artwork_url || artworkUrl;
    if (!finalArtworkUrl) {
      const err = new Error(
        "Artwork is required but was not uploaded successfully. Please try again."
      );
      err.alertTitle = "Artwork Required";
      throw err;
    }

    const { data, error } = await supabase
      .from("mixes")
      .insert({
        user_id: userProfile.id,
        artist: artistName,
        ...updateData,
        file_name: selectedFile.name,
        file_url: urlData.publicUrl,
        file_size: selectedFile.size,
        artwork_url: finalArtworkUrl,
        play_count: 0,
        likes_count: 0,
        duration:
          effectiveDurationMillis && Number.isFinite(effectiveDurationMillis)
            ? Math.round(effectiveDurationMillis / 1000)
            : null,
      })
      .select()
      .single();

    mixRecord = data;
    dbError = error;
  }

  if (dbError) {
    console.error("Database error:", dbError);
    await cleanupFailedUpload({
      fileName,
      artworkPath: uploadedArtworkPath,
    });
    throw dbError;
  }

  setProg(100);

  const primaryResult = await applyPrimaryMixIfRequested({
    db,
    userId,
    editingMix,
    mixRecord,
    userWantsPrimary: !!mixData.setAsPrimary,
  });

  return {
    mixRecord,
    becamePrimary: primaryResult.becamePrimary,
    primaryError: primaryResult.error,
    artworkUrl,
    fileExt,
    effectiveDurationMillis,
    artistName,
    fileName,
  };
}
