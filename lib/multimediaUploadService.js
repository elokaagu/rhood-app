import { devLog, storageObjectPath } from "./multimediaUtils";
import { supabase } from "./supabase";

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
  try {
    if (!selectedMedia) {
      throw new Error("No media selected for upload");
    }

    const bucket = "message-media";

    const bucketExists = await checkBucketExists(bucket);
    if (!bucketExists) {
      if (__DEV__) {
        console.warn(
          `⚠️ Bucket "${bucket}" check returned false, but attempting upload anyway...`
        );
      }
    }

    devLog("📤 Uploading media to storage:", selectedMedia.type);

    const response = await fetch(selectedMedia.uri);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    devLog(`📊 File size: ${fileData.length} bytes`);

    let fileName;
    switch (selectedMedia.type) {
      case "image":
        fileName = storageObjectPath("images", selectedMedia);
        break;
      case "video":
        fileName = storageObjectPath("videos", selectedMedia);
        break;
      case "audio":
        fileName = `audio/${Date.now()}_${selectedMedia.filename}`;
        break;
      case "document":
        fileName = `documents/${Date.now()}_${selectedMedia.filename}`;
        break;
      default:
        fileName = `files/${Date.now()}_${selectedMedia.filename}`;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType: selectedMedia.mimeType,
        upsert: false,
        cacheControl: "3600",
      });

    if (error) {
      console.error("❌ Supabase upload error:", error);

      if (
        error.message &&
        (error.message.includes("Bucket not found") ||
          error.message.includes("not found") ||
          error.message.includes("does not exist"))
      ) {
        throw new Error(
          `Storage bucket "${bucket}" not found. Please create it in Supabase Dashboard > Storage.\n\n` +
            `Steps:\n` +
            `1. Go to Supabase Dashboard > Storage\n` +
            `2. Click "New Bucket"\n` +
            `3. Name: message-media\n` +
            `4. Public: Yes (recommended)\n` +
            `5. File size limit: 250 MB (262144000 bytes)\n` +
            `6. Click "Create bucket"\n` +
            `7. Run the RLS policies from: database/setup-message-media-bucket.sql`
        );
      }

      throw new Error(`Upload failed: ${error.message}`);
    }

    devLog("✅ File uploaded successfully:", data.path);

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    let thumbnailUrl = null;
    if (selectedMedia.type === "video" && selectedMedia.thumbnail) {
      try {
        devLog("📸 Uploading video thumbnail...");
        const thumbResponse = await fetch(selectedMedia.thumbnail);
        if (thumbResponse.ok) {
          const thumbArrayBuffer = await thumbResponse.arrayBuffer();
          const thumbData = new Uint8Array(thumbArrayBuffer);
          const thumbFileName = `thumbnails/${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}.jpg`;

          const { error: thumbError } = await supabase.storage
            .from(bucket)
            .upload(thumbFileName, thumbData, {
              contentType: "image/jpeg",
              upsert: false,
              cacheControl: "3600",
            });

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(thumbFileName);
            thumbnailUrl = thumbUrlData.publicUrl;
            devLog("✅ Thumbnail uploaded:", thumbnailUrl);
          } else if (__DEV__) {
            console.warn("⚠️ Failed to upload thumbnail:", thumbError);
          }
        }
      } catch (thumbErr) {
        if (__DEV__) {
          console.warn("⚠️ Error uploading thumbnail:", thumbErr);
        }
      }
    }

    return {
      url: urlData.publicUrl,
      filename: selectedMedia.filename,
      size: selectedMedia.size,
      mimeType: selectedMedia.mimeType,
      thumbnailUrl: thumbnailUrl,
      fileExtension: selectedMedia.extension,
    };
  } catch (error) {
    console.error("❌ Error uploading to storage:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}
