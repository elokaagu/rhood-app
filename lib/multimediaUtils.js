export function devLog(...args) {
  if (__DEV__) {
    console.log(...args);
  }
}

export function featureUnavailableError(message, title = "Feature Unavailable") {
  const err = new Error(message);
  err.alertTitle = title;
  return err;
}

export function extensionFromName(name) {
  if (!name || typeof name !== "string") return null;
  const parts = name.split(".");
  if (parts.length < 2) return null;
  return parts.pop()?.toLowerCase() || null;
}

export function guessMimeFromExtension(ext) {
  if (!ext) return null;
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
    mkv: "video/x-matroska",
  };
  return map[ext.toLowerCase()] || null;
}

/**
 * Normalize a picked library asset (image/video) for upload and display.
 */
export function normalizeLibraryMediaAsset(asset, kind, index = 0) {
  if (!asset?.uri) {
    throw new Error(`Invalid ${kind} selected`);
  }
  const fileName = asset.fileName || asset.name || null;
  const extension =
    extensionFromName(fileName) || (kind === "image" ? "jpg" : "mp4");
  const typeLooksLikeMime =
    typeof asset.type === "string" && asset.type.includes("/");
  const mimeType =
    asset.mimeType ||
    (typeLooksLikeMime ? asset.type : null) ||
    guessMimeFromExtension(extension) ||
    (kind === "image" ? "image/jpeg" : "video/mp4");

  return {
    type: kind,
    uri: asset.uri,
    filename:
      fileName ||
      `${kind}_${Date.now()}${index ? `_${index}` : ""}.${extension}`,
    size: asset.fileSize || asset.size || 0,
    mimeType,
    width: asset.width ?? null,
    height: asset.height ?? null,
    duration: asset.duration ?? null,
    extension,
    thumbnail: asset.thumbnailUri || null,
  };
}

export function storageObjectPath(prefix, selectedMedia) {
  const ext =
    selectedMedia.extension ||
    extensionFromName(selectedMedia.filename) ||
    (selectedMedia.type === "image"
      ? "jpg"
      : selectedMedia.type === "video"
        ? "mp4"
        : "bin");
  const safeExt = /^[a-z0-9]{1,8}$/i.test(ext) ? ext : "bin";
  return `${prefix}/${Date.now()}_${Math.random().toString(36).substring(7)}.${safeExt}`;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileIcon(extension) {
  const iconMap = {
    pdf: "document-text",
    doc: "document-text",
    docx: "document-text",
    txt: "document-text",
    xls: "document-text",
    xlsx: "document-text",
    ppt: "document-text",
    pptx: "document-text",
    zip: "archive",
    rar: "archive",
    "7z": "archive",
    mp3: "musical-notes",
    wav: "musical-notes",
    aac: "musical-notes",
    flac: "musical-notes",
    mp4: "videocam",
    mov: "videocam",
    avi: "videocam",
    mkv: "videocam",
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    webp: "image",
  };
  return iconMap[extension?.toLowerCase()] || "document";
}
