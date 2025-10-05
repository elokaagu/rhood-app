import React, { createContext, useContext, useState, useRef } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

const AudioContext = createContext();

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  // Global audio state for persistent playback
  const [globalAudioState, setGlobalAudioState] = useState({
    isPlaying: false,
    currentTrack: null,
    progress: 0,
    isLoading: false,
    sound: null,
    isShuffled: false,
    repeatMode: "none", // 'none', 'one', 'all'
    positionMillis: 0,
    durationMillis: 0,
    queue: [], // Array of tracks in queue
    currentQueueIndex: -1, // Index of current track in queue
  });

  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);

  // Audio playback functions
  const playGlobalAudio = async (track) => {
    console.log("🎵 Playing audio:", track.title);

    try {
      // Stop current audio if playing
      if (globalAudioState.sound) {
        await globalAudioState.sound.unloadAsync();
      }

      setGlobalAudioState((prev) => ({ ...prev, isLoading: true }));

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true }
      );

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          const hasFinished =
            status.didJustFinish ||
            (status.positionMillis >= status.durationMillis - 100 &&
              status.durationMillis > 0);

          if (hasFinished && !status.isPlaying) {
            console.log("🎵 Track finished, checking for next track in queue");
            setGlobalAudioState((prev) => {
              setTimeout(() => {
                playNextTrack();
              }, 100);
              return {
                ...prev,
                isPlaying: false,
                isLoading: false,
                progress: 1,
                positionMillis: status.durationMillis || 0,
                durationMillis: status.durationMillis || 0,
              };
            });
            return;
          }

          setGlobalAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying,
            progress: status.durationMillis
              ? status.positionMillis / status.durationMillis
              : 0,
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
            isLoading: false,
          }));
        }
      });

      setGlobalAudioState((prev) => {
        let newQueue = [...prev.queue];
        let newIndex = newQueue.findIndex((t) => t.id === track.id);

        if (newIndex === -1) {
          newQueue.push(track);
          newIndex = newQueue.length - 1;
          console.log(
            `🎵 Added "${track.title}" to queue at index ${newIndex}`
          );
        } else {
          console.log(
            `🎵 Playing existing track from queue at index ${newIndex}`
          );
        }

        return {
          ...prev,
          sound: sound,
          isPlaying: true,
          currentTrack: track,
          isLoading: false,
          queue: newQueue,
          currentQueueIndex: newIndex,
        };
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("❌ Error playing audio:", error);
      setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const pauseGlobalAudio = async () => {
    if (globalAudioState.sound) {
      await globalAudioState.sound.pauseAsync();
      setGlobalAudioState((prev) => ({ ...prev, isPlaying: false }));
    }
  };

  const resumeGlobalAudio = async () => {
    if (globalAudioState.sound) {
      await globalAudioState.sound.playAsync();
      setGlobalAudioState((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const stopGlobalAudio = async () => {
    if (globalAudioState.sound) {
      await globalAudioState.sound.unloadAsync();
      setGlobalAudioState({
        isPlaying: false,
        currentTrack: null,
        progress: 0,
        isLoading: false,
        sound: null,
        isShuffled: false,
        repeatMode: "none",
        positionMillis: 0,
        durationMillis: 0,
        queue: [],
        currentQueueIndex: -1,
      });
    }
  };

  const seekToPosition = async (positionMillis) => {
    if (globalAudioState.sound && globalAudioState.durationMillis > 0) {
      try {
        const clampedPosition = Math.min(
          positionMillis,
          globalAudioState.durationMillis
        );
        await globalAudioState.sound.setPositionAsync(clampedPosition);

        setGlobalAudioState((prev) => ({
          ...prev,
          positionMillis: clampedPosition,
          progress: clampedPosition / prev.durationMillis,
        }));
      } catch (error) {
        console.error("❌ Error seeking audio:", error);
      }
    }
  };

  const handleProgressBarPress = async (event) => {
    console.log(`🎯 Progress bar pressed`);
    console.log(`🎯 Touch event:`, event.nativeEvent);

    if (globalAudioState.durationMillis <= 0 || globalAudioState.isLoading) {
      console.warn("⚠️ Cannot scrub - audio not ready");
      return;
    }

    const { locationX, pageX } = event.nativeEvent;
    const target = event.currentTarget;
    const progressBarWidth = target?.offsetWidth || target?.clientWidth || 300;

    console.log(
      `🎯 Touch details - locationX: ${locationX}, pageX: ${pageX}, width: ${progressBarWidth}`
    );

    const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));

    console.log(
      `🎯 Scrub to position: ${percentage} (${locationX}/${progressBarWidth})`
    );

    const newPosition = percentage * globalAudioState.durationMillis;
    console.log(
      `🎯 Seeking to ${newPosition}ms of ${globalAudioState.durationMillis}ms`
    );

    await seekToPosition(newPosition);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Queue management functions
  const addToQueue = (track) => {
    setGlobalAudioState((prev) => {
      const newQueue = [...prev.queue];
      if (!newQueue.find((t) => t.id === track.id)) {
        newQueue.push(track);
        console.log(`🎵 Added "${track.title}" to queue`);
      }
      return { ...prev, queue: newQueue };
    });
  };

  const addToQueueAndPlay = (track) => {
    playGlobalAudio(track);
  };

  const clearQueue = () => {
    setGlobalAudioState((prev) => ({
      ...prev,
      queue: [],
      currentQueueIndex: -1,
    }));
  };

  const getNextTrack = () => {
    const { queue, currentQueueIndex, repeatMode } = globalAudioState;

    if (queue.length === 0) return null;

    if (repeatMode === "one") {
      return queue[currentQueueIndex];
    }

    let nextIndex = currentQueueIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === "all") {
        nextIndex = 0;
      } else {
        return null; // No more tracks
      }
    }

    return queue[nextIndex];
  };

  const playNextTrack = () => {
    const nextTrack = getNextTrack();
    if (nextTrack) {
      console.log(`🎵 Playing next track: ${nextTrack.title}`);
      playGlobalAudio(nextTrack);
    } else {
      console.log("🎵 No more tracks in queue");
      stopGlobalAudio();
    }
  };

  const toggleShuffle = () => {
    setGlobalAudioState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
  };

  const toggleRepeat = () => {
    setGlobalAudioState((prev) => {
      const modes = ["none", "one", "all"];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...prev, repeatMode: modes[nextIndex] };
    });
  };

  const value = {
    globalAudioState,
    showFullScreenPlayer,
    setShowFullScreenPlayer,
    playGlobalAudio,
    pauseGlobalAudio,
    resumeGlobalAudio,
    stopGlobalAudio,
    seekToPosition,
    handleProgressBarPress,
    addToQueue,
    addToQueueAndPlay,
    clearQueue,
    getNextTrack,
    playNextTrack,
    toggleShuffle,
    toggleRepeat,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
