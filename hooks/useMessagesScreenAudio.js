import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import { Audio } from "expo-av";

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

  const formatDuration = useCallback((millis) => {
    if (!millis || isNaN(millis)) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Extract duration for audio/video messages when they load
  useEffect(() => {
    if (!messages.length) return;

    const extractDurationsForMessages = async () => {
      setAudioDurations((currentDurations) => {
        const messagesNeedingDuration = messages.filter(
          (msg) =>
            (msg.messageType === "audio" || msg.messageType === "video") &&
            msg.mediaUrl &&
            !currentDurations[msg.id] &&
            !durationExtractionInProgressRef.current.has(msg.id)
        );

        if (messagesNeedingDuration.length === 0) {
          return currentDurations;
        }

        console.log(
          `📊 Extracting duration for ${messagesNeedingDuration.length} media messages`
        );

        messagesNeedingDuration.forEach((message) => {
          durationExtractionInProgressRef.current.add(message.id);

          (async () => {
            try {
              if (Audio?.Sound?.createAsync) {
                const { sound } = await Audio.Sound.createAsync(
                  { uri: message.mediaUrl },
                  { shouldPlay: false }
                );
                const status = await sound.getStatusAsync();
                await sound.unloadAsync();
                if (status.isLoaded && status.durationMillis) {
                  setAudioDurations((prev) => {
                    if (prev[message.id]) {
                      durationExtractionInProgressRef.current.delete(message.id);
                      return prev;
                    }
                    durationExtractionInProgressRef.current.delete(message.id);
                    return {
                      ...prev,
                      [message.id]: status.durationMillis,
                    };
                  });
                  console.log(
                    `✅ Extracted duration for message ${message.id}: ${status.durationMillis}ms`
                  );
                } else {
                  durationExtractionInProgressRef.current.delete(message.id);
                }
              } else {
                durationExtractionInProgressRef.current.delete(message.id);
              }
            } catch (error) {
              console.warn(
                `⚠️ Unable to extract duration for message ${message.id}:`,
                error
              );
              durationExtractionInProgressRef.current.delete(message.id);
            }
          })();
        });

        return currentDurations;
      });
    };

    extractDurationsForMessages();
  }, [messages]);

  const toggleAudioPlayback = useCallback(
    async (messageId, audioUrl) => {
      try {
        console.log("🎵 Toggling audio playback:", { messageId, audioUrl });

        if (!audioUrl) {
          Alert.alert("Error", "Audio URL is missing");
          return;
        }

        if (playingAudioId === messageId) {
          const sound = audioSoundsRef.current[messageId];
          if (sound) {
            await sound.pauseAsync();
            setPlayingAudioId(null);
            console.log("⏸️ Audio paused");
          }
        } else {
          if (playingAudioId) {
            const currentSound = audioSoundsRef.current[playingAudioId];
            if (currentSound) {
              await currentSound.stopAsync();
              await currentSound.unloadAsync();
              delete audioSoundsRef.current[playingAudioId];
            }
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
          });

          console.log("🔄 Loading audio from:", audioUrl);
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: true }
          );

          audioSoundsRef.current[messageId] = sound;
          setPlayingAudioId(messageId);
          console.log("▶️ Audio started playing");

          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            console.log("📊 Audio duration:", status.durationMillis);
            setAudioDurations((prev) => ({
              ...prev,
              [messageId]: status.durationMillis,
            }));
          }

          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              setAudioProgress((prev) => ({
                ...prev,
                [messageId]: status.positionMillis || 0,
              }));

              if (status.didJustFinish) {
                console.log("✅ Audio finished");
                setPlayingAudioId((prev) => (prev === messageId ? null : prev));
                sound.unloadAsync();
                delete audioSoundsRef.current[messageId];
                setAudioProgress((prev) => ({
                  ...prev,
                  [messageId]: 0,
                }));
              }
            }
          });
        }
      } catch (error) {
        console.error("❌ Error playing audio:", error);
        console.error("❌ Error details:", {
          message: error.message,
          code: error.code,
          audioUrl,
        });
        Alert.alert(
          "Error",
          `Failed to play audio: ${error.message || "Unknown error"}`
        );
      }
    },
    [playingAudioId]
  );

  useEffect(() => {
    return () => {
      Object.values(audioSoundsRef.current).forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error("Error cleaning up audio:", error);
        }
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
