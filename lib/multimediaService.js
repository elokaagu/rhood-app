import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

// Dynamic imports for Expo Go compatibility
let ImagePicker;
let DocumentPicker;

try {
  ImagePicker = require("expo-image-picker");
} catch (e) {
  console.log("ImagePicker not available in Expo Go");
}

try {
  DocumentPicker = require("expo-document-picker");
} catch (e) {
  console.log("DocumentPicker not available in Expo Go");
}

export const multimediaService = {
  // ===== IMAGE UPLOAD =====

  /**
   * Pick and upload an image
   */
  async pickImage() {
    try {
      if (!ImagePicker) {
        throw new Error(
          "Image picker not available in Expo Go. Please use a development build for full functionality."
        );
      }

      console.log("📸 Starting image pick process...");

      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permission to access media library was denied");
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        console.log("📸 Image selection canceled");
        return null;
      }

      const asset = result.assets[0];
      console.log("📸 Selected image:", {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
      });

      // Validate image
      if (!asset.uri) {
        throw new Error("Invalid image selected");
      }

      return {
        type: "image",
        uri: asset.uri,
        filename: `image_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
        mimeType: "image/jpeg",
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.error("❌ Error picking image:", error);
      throw new Error(`Image pick failed: ${error.message}`);
    }
  },

  // ===== VIDEO UPLOAD =====

  /**
   * Pick and upload a video
   */
  async pickVideo() {
    try {
      if (!ImagePicker) {
        throw new Error(
          "Image picker not available in Expo Go. Please use a development build for full functionality."
        );
      }

      console.log("🎥 Starting video pick process...");

      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permission to access media library was denied");
      }

      // Pick video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (result.canceled) {
        console.log("🎥 Video selection canceled");
        return null;
      }

      const asset = result.assets[0];
      console.log("🎥 Selected video:", {
        uri: asset.uri,
        duration: asset.duration,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });

      // Validate video
      if (!asset.uri) {
        throw new Error("Invalid video selected");
      }

      // Check file size (250MB limit for videos)
      if (asset.fileSize && asset.fileSize > 250 * 1024 * 1024) {
        throw new Error("Video file size must be less than 250MB");
      }

      return {
        type: "video",
        uri: asset.uri,
        filename: `video_${Date.now()}.mp4`,
        size: asset.fileSize || 0,
        mimeType: "video/mp4",
        duration: asset.duration,
        thumbnail: null, // Will be generated during upload
      };
    } catch (error) {
      console.error("❌ Error picking video:", error);
      throw new Error(`Video pick failed: ${error.message}`);
    }
  },

  // ===== DOCUMENT/FILE UPLOAD =====

  /**
   * Pick and upload a document/file
   */
  async pickDocument() {
    try {
      if (!DocumentPicker) {
        // Return a user-friendly message instead of throwing an error
        console.log("📄 Document picker not available in Expo Go");
        return {
          type: "error",
          message:
            "Document picker is not available in Expo Go. Please use a development build or production app for full file sharing functionality.",
          available: false,
        };
      }

      console.log("📄 Starting document pick process...");

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log("📄 Document selection canceled");
        return null;
      }

      const file = result.assets[0];
      console.log("📄 Selected document:", {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
      });

      // Validate file
      if (!file.uri || !file.name) {
        throw new Error("Invalid file selected");
      }

      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("File size must be less than 25MB");
      }

      return {
        type: "document",
        uri: file.uri,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || "application/octet-stream",
        extension: file.name.split(".").pop()?.toLowerCase(),
      };
    } catch (error) {
      console.error("❌ Error picking document:", error);
      throw new Error(`Document pick failed: ${error.message}`);
    }
  },

  // ===== AUDIO UPLOAD =====

  /**
   * Pick and upload an audio file
   */
  async pickAudio() {
    try {
      if (!DocumentPicker) {
        throw new Error(
          "Document picker not available in Expo Go. Please use a development build for full functionality."
        );
      }

      console.log("🎵 Starting audio pick process...");

      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log("🎵 Audio selection canceled");
        return null;
      }

      const file = result.assets[0];
      console.log("🎵 Selected audio:", {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
      });

      // Validate file
      if (!file.uri || !file.name) {
        throw new Error("Invalid audio file selected");
      }

      // File size limit removed - allow audio files of any size
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.log(`🎵 Audio file size: ${fileSizeMB}MB - no size restrictions`);

      return {
        type: "audio",
        uri: file.uri,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || "audio/mpeg",
        extension: file.name.split(".").pop()?.toLowerCase(),
      };
    } catch (error) {
      console.error("❌ Error picking audio:", error);
      throw new Error(`Audio pick failed: ${error.message}`);
    }
  },

  // ===== UPLOAD TO STORAGE =====

  /**
   * Check if the message-media bucket exists
   */
  async checkBucketExists(bucketName = "message-media") {
    try {
      // Try to list buckets - this might fail due to permissions
      const { data, error } = await supabase.storage.listBuckets();

      if (error) {
        console.warn(
          "⚠️ Could not list buckets (might be permission issue):",
          error
        );
        // If we can't list buckets, assume it exists and let the upload attempt tell us
        return true; // Optimistic - let upload fail if bucket doesn't exist
      }

      const bucketExists = data?.some((bucket) => bucket.name === bucketName);
      console.log(
        bucketExists
          ? `✅ Bucket "${bucketName}" exists`
          : `❌ Bucket "${bucketName}" not found`
      );
      return bucketExists;
    } catch (error) {
      console.warn("⚠️ Error checking bucket (assuming exists):", error);
      // On error, assume bucket exists - upload will fail with clearer error if it doesn't
      return true;
    }
  },

  /**
   * Upload selected media to Supabase storage
   */
  async uploadToStorage(selectedMedia) {
    try {
      if (!selectedMedia) {
        throw new Error("No media selected for upload");
      }

      const bucket = "message-media";

      // Check if bucket exists (but don't block if check fails - try upload anyway)
      const bucketExists = await this.checkBucketExists(bucket);
      if (!bucketExists) {
        console.warn(
          `⚠️ Bucket "${bucket}" check returned false, but attempting upload anyway...`
        );
      }

      console.log("📤 Uploading media to storage:", selectedMedia.type);

      // Read file as Uint8Array for better performance and compatibility
      const response = await fetch(selectedMedia.uri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      console.log(`📊 File size: ${fileData.length} bytes`);

      // Generate filename based on type
      let fileName;

      switch (selectedMedia.type) {
        case "image":
          fileName = `images/${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}.jpg`;
          break;
        case "video":
          fileName = `videos/${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}.mp4`;
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

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileData, {
          contentType: selectedMedia.mimeType,
          upsert: false,
          cacheControl: "3600",
        });

      if (error) {
        console.error("❌ Supabase upload error:", error);

        // Provide helpful error message for missing bucket
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

      console.log("✅ File uploaded successfully:", data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        filename: selectedMedia.filename,
        size: selectedMedia.size,
        mimeType: selectedMedia.mimeType,
        thumbnailUrl: null, // Can be added later for videos
        fileExtension: selectedMedia.extension,
      };
    } catch (error) {
      console.error("❌ Error uploading to storage:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  },

  // ===== UTILITY FUNCTIONS =====

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Get file icon based on extension
   */
  getFileIcon(extension) {
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
  },

  /**
   * Check if multimedia features are available
   */
  isAvailable() {
    return {
      imagePicker: !!ImagePicker,
      documentPicker: !!DocumentPicker,
      fileSystem: !!FileSystem,
    };
  },
};

export default multimediaService;
