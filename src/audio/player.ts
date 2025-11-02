// src/audio/player.ts
// Player bootstrap and management for react-native-track-player
// Centralized setup for iOS native media controls

import TrackPlayer, { Capability, State } from "react-native-track-player";
import { Platform } from "react-native";

let isInitialized = false;

/**
 * Initialize the track player with capabilities
 * Should be called once at app startup
 */
export async function setupPlayer(): Promise<void> {
  if (isInitialized) {
    console.log("⚠️ Track player already initialized");
    return;
  }

  try {
    console.log("🎵 Initializing react-native-track-player...");

    // Setup the player
    await TrackPlayer.setupPlayer();

    // Configure capabilities for iOS lock screen and Control Center
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      // iOS specific options
      iosCategory: "playback",
      // Android specific options
      android: {
        // Keep existing Android notification behavior
        alwaysShowNotification: Platform.OS === "android",
      },
    });

    // Configure progress update interval (default is 1 second)
    // This controls how often we get progress updates for the lock screen
    await TrackPlayer.updateOptions({
      progressUpdateEventInterval: 1, // 1 second
    });

    isInitialized = true;
    console.log("✅ Track player initialized with capabilities");
  } catch (error) {
    console.error("❌ Failed to initialize track player:", error);
    throw error;
  }
}

/**
 * Add a track to the queue with metadata
 * @param track - Track object with url, title, artist, artwork, etc.
 */
export async function addTrack(track: {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  genre?: string;
}): Promise<void> {
  try {
    console.log("🎵 Adding track to queue:", {
      id: track.id,
      title: track.title,
      artist: track.artist,
      hasArtwork: !!track.artwork,
      duration: track.duration,
    });

    // Ensure player is initialized
    await setupPlayer();

    // Add track with metadata
    await TrackPlayer.add({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork || undefined, // Must be https URL, square, ≥1024px recommended
      duration: track.duration || undefined, // Duration in seconds
      genre: track.genre || "Electronic",
    });

    console.log("✅ Track added to queue");
  } catch (error) {
    console.error("❌ Failed to add track:", error);
    throw error;
  }
}

/**
 * Replace the current queue with a single track and start playing
 * @param track - Track to play
 */
export async function playTrack(track: {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  genre?: string;
}): Promise<void> {
  try {
    console.log("🎵 Playing track:", track.title);

    // Ensure player is initialized
    await setupPlayer();

    // Clear existing queue
    await TrackPlayer.reset();

    // Add the track
    await addTrack(track);

    // Start playing
    await TrackPlayer.play();

    console.log("✅ Track playing");
  } catch (error) {
    console.error("❌ Failed to play track:", error);
    throw error;
  }
}

/**
 * Pause playback
 */
export async function pause(): Promise<void> {
  try {
    await TrackPlayer.pause();
    console.log("⏸️ Playback paused");
  } catch (error) {
    console.error("❌ Failed to pause:", error);
    throw error;
  }
}

/**
 * Resume playback
 */
export async function resume(): Promise<void> {
  try {
    await TrackPlayer.play();
    console.log("▶️ Playback resumed");
  } catch (error) {
    console.error("❌ Failed to resume:", error);
    throw error;
  }
}

/**
 * Stop playback and clear queue
 */
export async function stop(): Promise<void> {
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    console.log("⏹️ Playback stopped");
  } catch (error) {
    console.error("❌ Failed to stop:", error);
    throw error;
  }
}

/**
 * Seek to a specific position
 * @param position - Position in seconds
 */
export async function seekTo(position: number): Promise<void> {
  try {
    await TrackPlayer.seekTo(position);
    console.log("⏩ Seeked to:", position);
  } catch (error) {
    console.error("❌ Failed to seek:", error);
    throw error;
  }
}

/**
 * Get current playback state
 */
export async function getPlaybackState(): Promise<{
  isPlaying: boolean;
  position: number;
  duration: number;
  track: any;
}> {
  try {
    const state = await TrackPlayer.getPlaybackState();
    const position = await TrackPlayer.getPosition();
    const duration = await TrackPlayer.getDuration();
    const track = await TrackPlayer.getActiveTrack();

    return {
      isPlaying: state === State.Playing,
      position,
      duration,
      track,
    };
  } catch (error) {
    console.error("❌ Failed to get playback state:", error);
    return {
      isPlaying: false,
      position: 0,
      duration: 0,
      track: null,
    };
  }
}

/**
 * Skip to next track
 */
export async function skipToNext(): Promise<void> {
  try {
    await TrackPlayer.skipToNext();
    console.log("⏭️ Skipped to next");
  } catch (error) {
    console.error("❌ Failed to skip to next:", error);
    throw error;
  }
}

/**
 * Skip to previous track
 */
export async function skipToPrevious(): Promise<void> {
  try {
    await TrackPlayer.skipToPrevious();
    console.log("⏮️ Skipped to previous");
  } catch (error) {
    console.error("❌ Failed to skip to previous:", error);
    throw error;
  }
}
