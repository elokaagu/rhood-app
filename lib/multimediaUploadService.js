import { devLog, storageObjectPath, guessMimeFromExtension, extensionFromName } from "./multimediaUtils";
import { supabase } from "./supabase";
import { uploadFileStreaming, withRetry, guardFileSizeBytes, sanitizeFileName } from "./uploadUtils";

/**
 * Best-effort storage preflight: lists buckets when allowed; on permission
 * or network errors returns true so upload can proceed and surface a real error.
 */
export async function checkBucketExists(bucketName = "message-media") {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      if (__DEV__) {
        console.warn(
          "⚠️ Could not list buckets (might be permission issue):",
          error
        );
      }
      return true;
    }

    const bucketExists = data?.some((bucket) => bucket.name === bucketName);
    devLog(
      bucketExists
        ? `✅ Bucket "${bucketName}" exists`
        : `❌ Bucket "${bucketName}" not found`
    );
    return bucketExists;
  } catch (error) {
    if (__DEV__) {
      console.warn("⚠️ Error checking bucket (assuming exists):", error);
    }
    return true;
  }
}

export async function uploadMediaToStorage(selectedMedia) {
  if (!selectedMedia) {
    throw new Error("No media selected for upload");
  }

  const bucket = "message-media";

  const bucketExists = await checkBucketExists(bucket);
  if (!bucketExists && __DEV__) {
    console.warn(`⚠️ Bucket "${bucket}" check returned false, attempting upload anyway…`);
  }

  devLog("📤 Uploading media to storage:", selectedMedia.type);

  // ── Derive a safe path (sanitize the original filename to avoid 400s) ──────
  const safeFilename = sanitizeFileName(selectedMedia.filename || `file_${Date.now()}`);

  let storagePath;
  switch (selectedMedia.type) {
    case "image":
      storagePath = storageObjectPath("images", selectedMedia);
      break;
    case "video":
      storagePath = storageObjectPath("videos", selectedMedia);
      break;
    case "audio":
      storagePath = `audio/${Date.now()}_${safeFilename}`;
      break;
    case "document":
      storagePath = `documents/${Date.now()}_${safeFilename}`;
      break;
    default:
      storagePath = `files/${Date.now()}_${safeFilename}`;
  }

  // ── Derive a reliable MIME type ───────────────────────────────────────────
  // Pickers sometimes return null, "image", or other non-standard values.
  const ext = extensionFromName(selectedMedia.filename || "");
  const mimeType =
    (typeof selectedMedia.mimeType === "string" && selectedMedia.mimeType.includes("/")
      ? selectedMedia.mimeType
      : null) ||
    guessMimeFromExtension(ext) ||
    (selectedMedia.type === "image" ? "image/jpeg" :
     selectedMedia.type === "video" ? "video/mp4" :
     selectedMedia.type === "audio" ? "audio/mpeg" :
     "application/octet-stream");

  // ── Pre-flight: make sure the file is still accessible ───────────────────
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;  // 20 MB
  await guardFileSizeBytes(
    selectedMedia.uri,
    selectedMedia.type === "image" ? MAX_IMAGE_BYTES : Infinity,
    selectedMedia.type === "image" ? "Image" : "File"
  );

  devLog(`📊 Uploading ${selectedMedia.type} as ${mimeType} → ${storagePath}`);

  // ── Upload: stream from disk (never loads full file into RAM) ─────────────
  let publicUrl;
  try {
    publicUrl = await withRetry(() =>
      uploadFileStreaming({
        bucket,
        path: storagePath,
        fileUri: selectedMedia.uri,
        contentType: mimeType,
        upsert: false,
      })
    );
  } catch (uploadErr) {
    console.error("❌ Supabase upload error:", uploadErr);

    if (
      uploadErr.message?.includes("Bucket not found") ||
      uploadErr.message?.includes("not found") ||
      uploadErr.message?.includes("does not exist")
    ) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Please create it in the Supabase Dashboard > Storage.\n` +
          `Name: message-media · Public: Yes · File size limit: 250 MB\n` +
          `Then run: database/setup-message-media-bucket.sql`
      );
    }

    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  devLog("✅ File uploaded successfully:", storagePath);

  // ── Video thumbnail — best-effort, never blocks the main upload ───────────
  let thumbnailUrl = null;
  if (selectedMedia.type === "video" && selectedMedia.thumbnail) {
    try {
      devLog("📸 Uploading video thumbnail…");
      const thumbPath = `thumbnails/${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;

      thumbnailUrl = await withRetry(() =>
        uploadFileStreaming({
          bucket,
          path: thumbPath,
          fileUri: selectedMedia.thumbnail,
          contentType: "image/jpeg",
          upsert: false,
        })
      );
      devLog("✅ Thumbnail uploaded:", thumbnailUrl);
    } catch (thumbErr) {
      if (__DEV__) console.warn("⚠️ Thumbnail upload failed (non-fatal):", thumbErr.message);
    }
  }

  return {
    url: publicUrl,
    filename: selectedMedia.filename,
    size: selectedMedia.size,
    mimeType,
    thumbnailUrl,
    fileExtension: selectedMedia.extension,
  };
}
