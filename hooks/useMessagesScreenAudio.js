import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import { Audio } from "expo-av";
import {
  applyMixPlaybackAudioMode,
  applyMessageAttachmentPlaybackAudioMode,
} from "../lib/audioSessionMode";

/**
 * In-thread audio message playback + duration extraction for message list items.
 *
 * @param {Array<{ id: string, messageType?: string, mediaUrl?: string }>} messages
 */
export function useMessagesScreenAudio(messages) {
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState({});
  const [audioDurations, setAudioDurations] = useState({});

  const audioSoundsRef = useRef({});
  const durationExtractionInProgressRef = useRef(new Set());
  const playbackRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const playingAudioIdRef = useRef(null);

  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  const formatDuration = useCallback((millis) => {
    if (!millis || isNaN(millis)) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Extract durations with a small concurrency cap to reduce spikes.
  useEffect(() => {
    if (!messages.length) return;

    let isActive = true;
    const MAX_CONCURRENT_DURATION_JOBS = 3;

    const messagesNeedingDuration = messages.filter(
      (msg) =>
        msg?.id &&
        (msg.messageType === "audio" || msg.messageType === "video") &&
        msg.mediaUrl &&
        !audioDurations[msg.id] &&
        !durationExtractionInProgressRef.current.has(msg.id)
    );

    if (messagesNeedingDuration.length === 0) return;

    if (__DEV__) {
      console.log(
        `Extracting duration for ${messagesNeedingDuration.length} media messages`
      );
    }

    const extractOne = async (message) => {
      durationExtractionInProgressRef.current.add(message.id);

      let sound;
      try {
        if (!Audio?.Sound?.createAsync) return;

        const created = await Audio.Sound.createAsync(
          { uri: message.mediaUrl },
          { shouldPlay: false }
        );
        sound = created.sound;

        const status = await sound.getStatusAsync();
        if (!isActive || !isMountedRef.current) return;

        if (status.isLoaded && status.durationMillis) {
          setAudioDurations((prev) => {
            if (prev[message.id]) return prev;
            return {
              ...prev,
              [message.id]: status.durationMillis,
            };
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(`Unable to extract duration for message ${message.id}:`, error);
        }
      } finally {
        durationExtractionInProgressRef.current.delete(message.id);
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (error) {
            if (__DEV__) {
              console.warn("Error unloading duration extraction sound:", error);
            }
          }
        }
      }
    };

    const runWithLimit = async () => {
      let currentIndex = 0;

      const worker = async () => {
        while (isActive && currentIndex < messagesNeedingDuration.length) {
          const nextIndex = currentIndex;
          currentIndex += 1;
          await extractOne(messagesNeedingDuration[nextIndex]);
        }
      };

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_DURATION_JOBS, messagesNeedingDuration.length) },
        () => worker()
      );

      await Promise.allSettled(workers);
    };

    void runWithLimit();

    return () => {
      isActive = false;
    };
  }, [messages, audioDurations]);

  const toggleAudioPlayback = useCallback(async (messageId, audioUrl) => {
    const requestId = playbackRequestRef.current + 1;
    playbackRequestRef.current = requestId;

    try {
      if (__DEV__) {
        console.log("Toggling audio playback:", { messageId, audioUrl });
      }

      if (!audioUrl) {
        Alert.alert("Error", "Audio URL is missing");
        return;
      }

      if (playingAudioIdRef.current === messageId) {
        const sound = audioSoundsRef.current[messageId];
        if (sound) {
          await sound.pauseAsync();
          if (!isMountedRef.current || requestId !== playbackRequestRef.current) return;
          setPlayingAudioId(null);
          void applyMixPlaybackAudioMode();
        }
        return;
      }

      const currentPlayingId = playingAudioIdRef.current;
      if (currentPlayingId) {
        const currentSound = audioSoundsRef.current[currentPlayingId];
        if (currentSound) {
          currentSound.setOnPlaybackStatusUpdate(null);
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
          delete audioSoundsRef.current[currentPlayingId];
        }
      }

      await applyMessageAttachmentPlaybackAudioMode();

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      if (!isMountedRef.current || requestId !== playbackRequestRef.current) {
        sound.setOnPlaybackStatusUpdate(null);
        await sound.unloadAsync();
        void applyMixPlaybackAudioMode();
        return;
      }

      audioSoundsRef.current[messageId] = sound;
      setPlayingAudioId(messageId);

      const status = await sound.getStatusAsync();
      if (
        isMountedRef.current &&
        requestId === playbackRequestRef.current &&
        status.isLoaded &&
        status.durationMillis
      ) {
        setAudioDurations((prev) => ({
          ...prev,
          [messageId]: status.durationMillis,
        }));
      }

      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (
          !isMountedRef.current ||
          playbackRequestRef.current !== requestId ||
          audioSoundsRef.current[messageId] !== sound ||
          !playbackStatus.isLoaded
        ) {
          return;
        }

        setAudioProgress((prev) => ({
          ...prev,
          [messageId]: playbackStatus.positionMillis || 0,
        }));

        if (playbackStatus.didJustFinish) {
          setPlayingAudioId((prev) => (prev === messageId ? null : prev));
          setAudioProgress((prev) => ({
            ...prev,
            [messageId]: 0,
          }));

          sound.setOnPlaybackStatusUpdate(null);
          void sound.unloadAsync();
          delete audioSoundsRef.current[messageId];
          void applyMixPlaybackAudioMode();
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        audioUrl,
      });
      void applyMixPlaybackAudioMode();
      Alert.alert(
        "Error",
        `Failed to play audio: ${error.message || "Unknown error"}`
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      playbackRequestRef.current += 1;

      const sounds = Object.values(audioSoundsRef.current);
      audioSoundsRef.current = {};

      void Promise.allSettled(
        sounds.map(async (sound) => {
          try {
            sound.setOnPlaybackStatusUpdate(null);
            await sound.unloadAsync();
          } catch (error) {
            console.error("Error cleaning up audio:", error);
          }
        })
      ).then(() => {
        void applyMixPlaybackAudioMode();
      });
    };
  }, []);

  return {
    playingAudioId,
    audioProgress,
    audioDurations,
    toggleAudioPlayback,
    formatDuration,
  };
}
