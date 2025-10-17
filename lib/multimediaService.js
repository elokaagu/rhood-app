import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from './supabase';

export const multimediaService = {
  // ===== IMAGE UPLOAD =====
  
  /**
   * Pick and upload an image
   */
  async uploadImage() {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library was denied');
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
        return null;
      }

      const asset = result.assets[0];
      console.log('📸 Selected image:', asset);

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        asset.uri,
        'message-media',
        `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`,
        'image/jpeg'
      );

      return {
        type: 'image',
        url: uploadResult.url,
        filename: `image_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
        mimeType: 'image/jpeg',
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  // ===== VIDEO UPLOAD =====
  
  /**
   * Pick and upload a video
   */
  async uploadVideo() {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library was denied');
      }

      // Pick video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 1 minute max
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      console.log('🎥 Selected video:', asset);

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        asset.uri,
        'message-media',
        `videos/${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`,
        'video/mp4'
      );

      // Generate thumbnail (simplified - in production you'd want proper video thumbnail generation)
      const thumbnailUrl = await this.generateVideoThumbnail(asset.uri);

      return {
        type: 'video',
        url: uploadResult.url,
        filename: `video_${Date.now()}.mp4`,
        size: asset.fileSize || 0,
        mimeType: 'video/mp4',
        duration: asset.duration,
        thumbnailUrl,
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  },

  // ===== DOCUMENT/FILE UPLOAD =====
  
  /**
   * Pick and upload a document/file
   */
  async uploadDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const file = result.assets[0];
      console.log('📄 Selected document:', file);

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        file.uri,
        'message-media',
        `documents/${Date.now()}_${file.name}`,
        file.mimeType || 'application/octet-stream'
      );

      return {
        type: 'file',
        url: uploadResult.url,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || 'application/octet-stream',
        extension: file.name.split('.').pop()?.toLowerCase(),
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  // ===== AUDIO UPLOAD =====
  
  /**
   * Pick and upload an audio file
   */
  async uploadAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const file = result.assets[0];
      console.log('🎵 Selected audio:', file);

      // Check file size (25MB limit for audio)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('Audio file size must be less than 25MB');
      }

      // Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(
        file.uri,
        'message-media',
        `audio/${Date.now()}_${file.name}`,
        file.mimeType || 'audio/mpeg'
      );

      return {
        type: 'audio',
        url: uploadResult.url,
        filename: file.name,
        size: file.size,
        mimeType: file.mimeType || 'audio/mpeg',
        extension: file.name.split('.').pop()?.toLowerCase(),
      };
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  },

  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Upload file to Supabase storage
   */
  async uploadToStorage(fileUri, bucket, fileName, mimeType) {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, base64, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Error uploading to storage:', error);
      throw error;
    }
  },

  /**
   * Generate video thumbnail (simplified implementation)
   */
  async generateVideoThumbnail(videoUri) {
    try {
      // In a real implementation, you'd use a library like expo-video-thumbnails
      // For now, we'll return a placeholder
      return null;
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
      return null;
    }
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get file icon based on extension
   */
  getFileIcon(extension) {
    const iconMap = {
      pdf: 'document-text',
      doc: 'document-text',
      docx: 'document-text',
      txt: 'document-text',
      xls: 'document-text',
      xlsx: 'document-text',
      ppt: 'document-text',
      pptx: 'document-text',
      zip: 'archive',
      rar: 'archive',
      '7z': 'archive',
      mp3: 'musical-notes',
      wav: 'musical-notes',
      aac: 'musical-notes',
      flac: 'musical-notes',
      mp4: 'videocam',
      mov: 'videocam',
      avi: 'videocam',
      mkv: 'videocam',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
    };
    return iconMap[extension?.toLowerCase()] || 'document';
  },
};
