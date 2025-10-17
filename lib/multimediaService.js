import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "./supabase";

export const multimediaService = {
  // ===== IMAGE UPLOAD =====

  /**
   * Pick and upload an image
   */
  async uploadImage() {
    try {
      console.log("📸 Starting image upload process...");

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

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        asset.uri,
        "message-media",
        `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`,
        "image/jpeg"
      );

      console.log("✅ Image uploaded successfully:", uploadResult.url);

      return {
        type: "image",
        url: uploadResult.url,
        filename: `image_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
        mimeType: "image/jpeg",
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  },

  // ===== VIDEO UPLOAD =====

  /**
   * Pick and upload a video
   */
  async uploadVideo() {
    try {
      console.log("🎥 Starting video upload process...");

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

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        asset.uri,
        "message-media",
        `videos/${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`,
        "video/mp4"
      );

      console.log("✅ Video uploaded successfully:", uploadResult.url);

      // Generate thumbnail (simplified - in production you'd want proper video thumbnail generation)
      const thumbnailUrl = await this.generateVideoThumbnail(asset.uri);

      return {
        type: "video",
        url: uploadResult.url,
        filename: `video_${Date.now()}.mp4`,
        size: asset.fileSize || 0,
        mimeType: "video/mp4",
        duration: asset.duration,
        thumbnailUrl,
      };
    } catch (error) {
      console.error("❌ Error uploading video:", error);
      throw new Error(`Video upload failed: ${error.message}`);
    }
  },

  // ===== DOCUMENT/FILE UPLOAD =====

  /**
   * Pick and upload a document/file
   */
  async uploadDocument() {
    try {
      console.log("📄 Starting document upload process...");

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

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        file.uri,
        "message-media",
        `documents/${Date.now()}_${file.name}`,
        file.mimeType || "application/octet-stream"
      );

      console.log("✅ Document uploaded successfully:", uploadResult.url);

      return {
        type: "file",
        url: uploadResult.url,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || "application/octet-stream",
        extension: file.name.split(".").pop()?.toLowerCase(),
      };
    } catch (error) {
      console.error("❌ Error uploading document:", error);
      throw new Error(`Document upload failed: ${error.message}`);
    }
  },

  // ===== AUDIO UPLOAD =====

  /**
   * Pick and upload an audio file
   */
  async uploadAudio() {
    try {
      console.log("🎵 Starting audio upload process...");

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

      // Check file size (250MB limit for audio)
      if (file.size > 250 * 1024 * 1024) {
        throw new Error("Audio file size must be less than 250MB");
      }

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        file.uri,
        "message-media",
        `audio/${Date.now()}_${file.name}`,
        file.mimeType || "audio/mpeg"
      );

      console.log("✅ Audio uploaded successfully:", uploadResult.url);

      return {
        type: "audio",
        url: uploadResult.url,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || "audio/mpeg",
        extension: file.name.split(".").pop()?.toLowerCase(),
      };
    } catch (error) {
      console.error("❌ Error uploading audio:", error);
      throw new Error(`Audio upload failed: ${error.message}`);
    }
  },

  // ===== UTILITY FUNCTIONS =====

  /**
   * Upload file to Supabase storage
   */
  async uploadToStorage(fileUri, bucket, fileName, mimeType) {
    try {
      console.log(`📤 Uploading file to ${bucket}:`, fileName);

      // Read file as Uint8Array for better performance and compatibility
      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      console.log(`📊 File size: ${fileData.length} bytes`);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileData, {
          contentType: mimeType,
          upsert: false,
          cacheControl: "3600",
        });

      if (error) {
        console.error("❌ Supabase upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log("✅ File uploaded successfully:", data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error("❌ Error uploading to storage:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  },

  /**
   * Generate video thumbnail (simplified implementation)
   */
  async generateVideoThumbnail(videoUri) {
    try {
      // For now, we'll create a simple placeholder thumbnail
      // In production, you'd use expo-video-thumbnails or similar
      console.log("🎬 Generating video thumbnail for:", videoUri);

      // Create a simple thumbnail by uploading a placeholder image
      const thumbnailFileName = `thumbnails/${Date.now()}_thumbnail.jpg`;

      // For now, return null - thumbnails can be added later
      // This prevents errors while keeping the functionality working
      return null;
    } catch (error) {
      console.error("❌ Error generating video thumbnail:", error);
      return null;
    }
  },

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
};
