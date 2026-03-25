import {
  devLog,
  extensionFromName,
  featureUnavailableError,
  normalizeLibraryMediaAsset,
} from "./multimediaUtils";

let ImagePicker;
let DocumentPicker;
let VideoThumbnails;

try {
  ImagePicker = require("expo-image-picker");
} catch (e) {
  if (__DEV__) {
    console.log("ImagePicker not available in Expo Go");
  }
}

try {
  DocumentPicker = require("expo-document-picker");
} catch (e) {
  if (__DEV__) {
    console.log("DocumentPicker not available in Expo Go");
  }
}

try {
  VideoThumbnails = require("expo-video-thumbnails");
} catch (e) {
  if (__DEV__) {
    console.log("VideoThumbnails not available");
  }
}

async function ensureImagePickerLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission to access media library was denied");
  }
}

export const multimediaPickerService = {
  async pickImage() {
    try {
      if (!ImagePicker) {
        throw featureUnavailableError(
          "Image picker is not available in Expo Go. Use a development build for full functionality."
        );
      }

      devLog("📸 Starting image pick process...");
      await ensureImagePickerLibraryPermission();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        devLog("📸 Image selection canceled");
        return null;
      }

      const asset = result.assets[0];
      devLog("📸 Selected image:", {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
      });

      return normalizeLibraryMediaAsset(asset, "image");
    } catch (error) {
      console.error("❌ Error picking image:", error);
      if (error.alertTitle) throw error;
      throw new Error(`Image pick failed: ${error.message}`);
    }
  },

  async pickMultipleImages(maxImages = 10) {
    try {
      if (!ImagePicker) {
        throw featureUnavailableError(
          "Image picker is not available in Expo Go. Use a development build for full functionality."
        );
      }

      devLog("📸 Starting multiple image pick process...");
      await ensureImagePickerLibraryPermission();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
        selectionLimit: maxImages,
      });

      if (result.canceled) {
        devLog("📸 Image selection canceled");
        return null;
      }

      if (!result.assets || result.assets.length === 0) {
        return null;
      }

      devLog(`📸 Selected ${result.assets.length} images`);

      return result.assets.map((asset, index) =>
        normalizeLibraryMediaAsset(asset, "image", index)
      );
    } catch (error) {
      console.error("❌ Error picking multiple images:", error);
      if (error.alertTitle) throw error;
      throw new Error(`Multiple image pick failed: ${error.message}`);
    }
  },

  async pickVideo() {
    try {
      if (!ImagePicker) {
        throw featureUnavailableError(
          "Image picker is not available in Expo Go. Use a development build for full functionality."
        );
      }

      devLog("🎥 Starting video pick process...");
      await ensureImagePickerLibraryPermission();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 300,
        videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
      });

      if (result.canceled) {
        devLog("🎥 Video selection canceled");
        return null;
      }

      const asset = result.assets[0];
      let thumbnailUri = asset.thumbnailUri || null;

      // iOS often omits thumbnailUri for picked videos; generate one so chat can show preview.
      if (!thumbnailUri && VideoThumbnails?.getThumbnailAsync && asset.uri) {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 1000,
          });
          thumbnailUri = thumb?.uri || null;
        } catch (thumbError) {
          if (__DEV__) {
            console.warn("⚠️ Could not generate video thumbnail:", thumbError?.message);
          }
        }
      }

      devLog("🎥 Selected video:", {
        uri: asset.uri,
        duration: asset.duration,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
        thumbnailUri,
      });

      if (asset.fileSize && asset.fileSize > 250 * 1024 * 1024) {
        throw new Error("Video file size must be less than 250MB");
      }

      return normalizeLibraryMediaAsset(
        {
          ...asset,
          thumbnailUri,
        },
        "video"
      );
    } catch (error) {
      console.error("❌ Error picking video:", error);
      if (error.alertTitle) throw error;
      throw new Error(`Video pick failed: ${error.message}`);
    }
  },

  async pickDocument() {
    try {
      if (!DocumentPicker) {
        throw featureUnavailableError(
          "Document picker is not available in Expo Go. Use a development build or production app for file sharing."
        );
      }

      devLog("📄 Starting document pick process...");

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        devLog("📄 Document selection canceled");
        return null;
      }

      const file = result.assets[0];
      devLog("📄 Selected document:", {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
      });

      if (!file.uri || !file.name) {
        throw new Error("Invalid file selected");
      }

      if (file.size > 25 * 1024 * 1024) {
        throw new Error("File size must be less than 25MB");
      }

      const extension = extensionFromName(file.name);

      return {
        type: "document",
        uri: file.uri,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || "application/octet-stream",
        extension,
      };
    } catch (error) {
      console.error("❌ Error picking document:", error);
      if (error.alertTitle) throw error;
      throw new Error(`Document pick failed: ${error.message}`);
    }
  },

  async pickAudio() {
    try {
      if (!DocumentPicker) {
        throw featureUnavailableError(
          "Document picker is not available in Expo Go. Use a development build for full functionality."
        );
      }

      devLog("🎵 Starting audio pick process...");

      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        devLog("🎵 Audio selection canceled");
        return null;
      }

      const file = result.assets[0];
      devLog("🎵 Selected audio:", {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
      });

      if (!file.uri || !file.name) {
        throw new Error("Invalid audio file selected");
      }

      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      devLog(`🎵 Audio file size: ${fileSizeMB}MB`);

      const extension = extensionFromName(file.name);

      return {
        type: "audio",
        uri: file.uri,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || "audio/mpeg",
        extension,
      };
    } catch (error) {
      console.error("❌ Error picking audio:", error);
      if (error.alertTitle) throw error;
      throw new Error(`Audio pick failed: ${error.message}`);
    }
  },

  isAvailable() {
    return {
      imagePicker: !!ImagePicker,
      documentPicker: !!DocumentPicker,
    };
  },
};
