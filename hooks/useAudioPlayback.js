import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import {
  Platform,
  Alert,
  Share,
  InteractionManager,
} from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { HapticPatterns } from "../lib/haptics";
import lockScreenControls from "../lib/lockScreenControls";
import { db, supabase } from "../lib/supabase";
import { getAudioErrorMessage } from "../lib/errorMessages";
import { useAudioState, useAudioActions } from "../context/AudioContext";

/** Mix duration in ms from metadata (Listen/DB). Used when expo-av reports 0 briefly. */
function trackMetaDurationMs(track) {
  if (!track) return 0;
  if (typeof track.durationMillis === "number" && track.durationMillis > 0)
    return Math.round(track.durationMillis);
  const raw = track.durationSeconds ?? track.duration;
  if (raw == null || !Number.isFinite(Number(raw)) || Number(raw) <= 0) return 0;
  const n = Number(raw);
  if (n > 5_000_000) return Math.round(n);
  return Math.round(n * 1000);
}

/** Fisher-Yates shuffle */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Weighted shuffle for recommendation-based shuffling */
function weightedShuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const weights = shuffled.slice(0, i + 1).map(item => item.recommendationWeight || 0.5);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    [shuffled[i], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[i]];
  }
  return shuffled;
}

/**
 * Hook that encapsulates all audio playback logic.
 * Must be used within an AudioProvider.
 *
 * @param {{ user: object|null }} options
 */
export default function useAudioPlayback({ user }) {
  // ── Context ──────────────────────────────────────────────
  const audioState = useAudioState();
  const { setGlobalAudioState, actionsRef, stateRef } = useAudioActions();

  // ── Local state ──────────────────────────────────────────
  const [likedMixIds, setLikedMixIds] = useState(() => new Set());
  const [pendingPlayTrack, setPendingPlayTrack] = useState(null);
  const [audioErrorModal, setAudioErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // ── Refs ─────────────────────────────────────────────────
  const globalAudioRef = useRef(null);
  const isPlayingAudioRef = useRef(false);
  const trackFinishedRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const playNextTrackRef = useRef(null);
  const playPreviousTrackRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────

  // ── Fetch liked mixes ────────────────────────────────────

  const fetchUserLikedMixes = useCallback(async () => {
    if (!user?.id) {
      setLikedMixIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("mix_likes")
        .select("mix_id")
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          if (__DEV__) console.warn("mix_likes table not found. Skipping liked mixes fetch.");
          return;
        }
        if (__DEV__) console.error("❌ Error fetching liked mixes:", error);
        return;
      }

      const likedSet = new Set(
        (data || [])
          .map((row) => row?.mix_id)
          .filter((mixId) => mixId !== null && mixId !== undefined)
      );

      setLikedMixIds(likedSet);
    } catch (error) {
      if (__DEV__) console.error("❌ Unexpected error fetching liked mixes:", error);
    }
  }, [user?.id]);

  // ── Core playback ────────────────────────────────────────

  const playGlobalAudio = useCallback(async (track) => {
    // Prevent duplicate calls
    if (isPlayingAudioRef.current) {
      if (__DEV__) console.log("⚠️ playGlobalAudio already in progress, ignoring duplicate call");
      return;
    }

    // Show mini bar + full-screen immediately
    const trackForUI = {
      ...track,
      image: track.image || track.artwork_url || track.image_url || null,
      isLiked: likedMixIds.has(track.id),
    };
    setPendingPlayTrack(trackForUI);

    try {
      isPlayingAudioRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (__DEV__) {
        console.log("🎵 playGlobalAudio called with track:", {
          id: track.id,
          title: track.title,
          artist: track.artist,
          audioUrl: track.audioUrl ? "URL provided" : "No URL",
        });
      }

      // Context state so playback logic and lock screen see current track
      setGlobalAudioState((prev) => ({
        ...prev,
        isLoading: true,
        currentTrack: trackForUI,
      }));
      trackFinishedRef.current = false;

      InteractionManager.runAfterInteractions(() => {
        runPlayback();
      });

      async function runPlayback() {
        try {
          // Validate audio URL
          const audioUrl =
            (typeof track.audioUrl === "string" && track.audioUrl.trim()
              ? track.audioUrl.trim()
              : null) ||
            track.audioUrl?.uri ||
            (typeof track.file_url === "string" && track.file_url.trim()
              ? track.file_url.trim()
              : null) ||
            track.audio_url ||
            null;

          if (!audioUrl) {
            throw new Error("Audio URL is missing. Please check that the mix has a valid audio file.");
          }

          if (!audioUrl.startsWith("http://") && !audioUrl.startsWith("https://") && !audioUrl.startsWith("file://")) {
            throw new Error("Invalid audio URL format. The audio file URL must be a valid HTTP/HTTPS or file URL.");
          }

          // Stop current audio if playing
          if (globalAudioRef.current) {
            await globalAudioRef.current.unloadAsync();
            globalAudioRef.current = null;
          }

          // Configure audio mode for playback
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          // Determine audio source
          const audioSource =
            typeof audioUrl === "string"
              ? { uri: audioUrl }
              : track.audioUrl;

          // Load audio
          let sound;
          try {
            const { sound: loadedSound } = await Audio.Sound.createAsync(
              audioSource,
              {
                shouldPlay: false,
                isLooping: false,
                volume: 1.0,
                progressUpdateIntervalMillis: 250,
              }
            );
            sound = loadedSound;
          } catch (loadError) {
            if (__DEV__) {
              console.warn("Audio load failed:", loadError?.message || loadError?.code || "Unknown");
            }
            setGlobalAudioState((prev) => ({
              ...prev,
              isLoading: false,
              isPlaying: false,
              currentTrack: null,
              error: getAudioErrorMessage(loadError),
            }));
            setAudioErrorModal({
              visible: true,
              title: "Unable to Play Audio",
              message: getAudioErrorMessage(loadError),
            });
            return;
          }

          // Verify sound loaded correctly
          try {
            const status = await sound.getStatusAsync();
            if (__DEV__) {
              console.log("📊 Initial sound status:", {
                isLoaded: status.isLoaded,
                durationMillis: status.durationMillis,
              });
            }

            if (!status.isLoaded) {
              await sound.unloadAsync();
              throw new Error("Sound failed to load properly");
            }

            if (status.durationMillis === 0) {
              await sound.unloadAsync();
              const error = new Error("Audio file has invalid duration");
              setGlobalAudioState((prev) => ({
                ...prev,
                isLoading: false,
                isPlaying: false,
                currentTrack: null,
                error: getAudioErrorMessage(error),
              }));
              setAudioErrorModal({
                visible: true,
                title: "Unable to Play Audio",
                message: getAudioErrorMessage(error),
              });
              return;
            }
          } catch (statusError) {
            if (sound) {
              try { await sound.unloadAsync(); } catch (_) {}
            }
            setGlobalAudioState((prev) => ({
              ...prev,
              isLoading: false,
              isPlaying: false,
              currentTrack: null,
              error: getAudioErrorMessage(statusError),
            }));
            setAudioErrorModal({
              visible: true,
              title: "Unable to Play Audio",
              message: getAudioErrorMessage(statusError),
            });
            return;
          }

          // Set up status update listener
          let durationUpdated = false;
          sound.setOnPlaybackStatusUpdate((status) => {
            try {
              if (status.isLoaded) {
                const nativeDur =
                  status.durationMillis > 0 ? status.durationMillis : 0;
                const metaMs = trackMetaDurationMs(track);
                if (!isScrubbingRef.current) {
                  setGlobalAudioState((prev) => {
                    const durationMillis =
                      nativeDur > 0
                        ? nativeDur
                        : prev.durationMillis > 0
                          ? prev.durationMillis
                          : metaMs;
                    const pos = status.positionMillis ?? 0;
                    const dur = durationMillis > 0 ? durationMillis : metaMs;
                    return {
                      ...prev,
                      isPlaying: status.isPlaying,
                      isLoading: false,
                      positionMillis: pos,
                      durationMillis: dur > 0 ? dur : prev.durationMillis,
                      progress:
                        dur > 0 ? Math.min(1, pos / dur) : prev.progress ?? 0,
                    };
                  });
                }
                if (Platform.OS === "android") {
                  lockScreenControls.updatePlaybackState(
                    status.isPlaying,
                    status.positionMillis || 0,
                    status.durationMillis || 0
                  );
                }

                // Check if track has finished playing
                const hasFinished =
                  status.didJustFinish ||
                  (status.positionMillis >= status.durationMillis - 50 &&
                    status.durationMillis > 0 &&
                    !isScrubbingRef.current &&
                    !status.isPlaying);

                if (hasFinished && !trackFinishedRef.current) {
                  trackFinishedRef.current = true;
                  if (__DEV__) console.log("🎵 Track finished, checking for next track in queue");
                  // Schedule side effect outside setState
                  const doPlayNext = async () => {
                    if (playNextTrackRef.current) {
                      await playNextTrackRef.current();
                    }
                  };
                  setGlobalAudioState((prev) => ({
                    ...prev,
                    isPlaying: false,
                    isLoading: false,
                    progress: 1,
                    positionMillis: status.durationMillis || 0,
                    durationMillis: status.durationMillis || 0,
                  }));
                  setTimeout(doPlayNext, 100);
                  return;
                }

                // Update duration in DB once (async, don't block)
                if (!durationUpdated && status.durationMillis > 0 && track.id) {
                  durationUpdated = true;
                  const durationInSeconds = Math.floor(status.durationMillis / 1000);
                  supabase
                    .from("mixes")
                    .update({ duration: durationInSeconds })
                    .eq("id", track.id)
                    .is("duration", null)
                    .then(({ error }) => {
                      if (error && __DEV__) console.error("❌ Error updating duration:", error);
                    })
                    .catch(() => {});
                }
              } else if (status.error) {
                setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));
              }
            } catch (err) {
              if (__DEV__) console.warn("Playback status callback error:", err?.message);
            }
          });

          // Store reference for cleanup
          globalAudioRef.current = sound;

          // Start playing
          if (__DEV__) console.log("▶️ Starting playback...");
          try {
            await sound.playAsync();
            if (__DEV__) console.log("✅ Playback started successfully");
            try {
              await sound.setProgressUpdateIntervalAsync(500);
            } catch (_) {}
          } catch (playError) {
            if (__DEV__) console.error("❌ Playback failed:", playError);
            throw playError;
          }

          let initialStatus = null;
          try {
            initialStatus = await sound.getStatusAsync();
          } catch (statusErr) {
            if (__DEV__) console.warn("Initial playback status for UI:", statusErr?.message);
          }

          setGlobalAudioState((prev) => {
            // If this track is not in the queue, add it
            let newQueue = [...prev.queue];
            let newIndex = newQueue.findIndex((t) => t.id === track.id);

            if (newIndex === -1) {
              newQueue.push(track);
              newIndex = newQueue.length - 1;
            }

            // Transform track to ensure user data is available
            let userImage = track.user_image || track.user?.profile_image_url;
            let userDjName = track.user_dj_name || track.user?.dj_name;
            let userBio = track.user_bio || track.user?.bio;
            const userId = track.user_id || track.user?.id;

            // Check if mix is liked
            let isLiked = likedMixIds.has(track.id);
            if (user?.id && track.id && !isLiked) {
              // Check database in background
              supabase
                .from("mix_likes")
                .select("mix_id")
                .eq("user_id", user.id)
                .eq("mix_id", track.id)
                .single()
                .then(({ data: likeData }) => {
                  if (likeData) {
                    setLikedMixIds((prev) => {
                      const updated = new Set(prev);
                      updated.add(track.id);
                      return updated;
                    });
                    setGlobalAudioState((prev) => {
                      if (prev.currentTrack?.id === track.id) {
                        return {
                          ...prev,
                          currentTrack: { ...prev.currentTrack, isLiked: true },
                        };
                      }
                      return prev;
                    });
                  }
                })
                .catch(() => {});
            }

            // Fetch missing user profile data in background
            if (!userImage && userId) {
              supabase
                .from("user_profiles")
                .select("profile_image_url, dj_name, bio")
                .eq("id", userId)
                .single()
                .then(({ data: userProfile }) => {
                  if (userProfile) {
                    setGlobalAudioState((prev) => {
                      if (prev.currentTrack?.id === track.id) {
                        return {
                          ...prev,
                          currentTrack: {
                            ...prev.currentTrack,
                            user_image: userProfile.profile_image_url || prev.currentTrack.user_image,
                            user_dj_name: userProfile.dj_name || prev.currentTrack.user_dj_name,
                            user_bio: userProfile.bio || prev.currentTrack.user_bio,
                          },
                        };
                      }
                      return prev;
                    });
                  }
                })
                .catch(() => {});
            }

            const enhancedTrack = {
              ...track,
              user_id: userId,
              user_image: userImage,
              user_dj_name: userDjName,
              user_bio: userBio,
              isLiked: isLiked,
            };

            const next = {
              ...prev,
              sound: sound,
              isPlaying: true,
              currentTrack: enhancedTrack,
              isLoading: false,
              queue: newQueue,
              currentQueueIndex: newIndex,
            };
            const trackDur = trackMetaDurationMs(track);
            if (initialStatus?.isLoaded && initialStatus?.durationMillis > 0) {
              const d = Math.max(initialStatus.durationMillis ?? 0, trackDur || 0);
              next.positionMillis = initialStatus.positionMillis ?? 0;
              next.durationMillis = d;
              next.progress = d > 0 ? (initialStatus.positionMillis ?? 0) / d : 0;
            } else if (trackDur > 0) {
              next.positionMillis = 0;
              next.durationMillis = trackDur;
              next.progress = 0;
            }
            return next;
          });

          // Set up lock screen controls (Android)
          if (Platform.OS === "android") {
            await lockScreenControls.initialize();
            lockScreenControls.setCallbacks({
              onPlayPause: async () => {
                try {
                  if (globalAudioRef.current) {
                    const status = await globalAudioRef.current.getStatusAsync();
                    if (status.isLoaded && status.isPlaying) {
                      await pauseGlobalAudio();
                    } else {
                      await resumeGlobalAudio();
                    }
                  } else if (stateRef.current.isPlaying) {
                    await pauseGlobalAudio();
                  } else {
                    await resumeGlobalAudio();
                  }
                } catch (error) {
                  if (__DEV__) console.error("❌ Lock screen play/pause error:", error);
                }
              },
              onNext: async () => {
                try {
                  if (playNextTrackRef.current) await playNextTrackRef.current();
                } catch (error) {
                  if (__DEV__) console.error("❌ Lock screen next error:", error);
                }
              },
              onPrevious: async () => {
                try {
                  if (playPreviousTrackRef.current) await playPreviousTrackRef.current();
                } catch (error) {
                  if (__DEV__) console.error("❌ Lock screen previous error:", error);
                }
              },
            });

            const lockStatus = await sound.getStatusAsync();
            await lockScreenControls.showNotification({
              id: track.id,
              title: track.title || "R/HOOD Mix",
              artist: track.artist || "Unknown Artist",
              image: track.image || null,
              durationMillis: lockStatus.durationMillis || 0,
            });
          }

          if (__DEV__) console.log("🎉 Global audio started successfully:", track.title);
        } catch (error) {
          if (__DEV__) {
            console.error("❌ Error playing global audio:", error);
          }
          setPendingPlayTrack(null);
          setGlobalAudioState((prev) => ({ ...prev, isLoading: false }));

          const errorMessage = error.message || "Unknown error occurred";
          const userFriendlyMessage = errorMessage.includes("Audio URL is missing")
            ? "This mix doesn't have an audio file. Please contact the artist or try another mix."
            : errorMessage.includes("Invalid audio URL")
            ? "The audio file URL is invalid. Please try again or contact support."
            : errorMessage.includes("Failed to start playback")
            ? errorMessage
            : `Failed to play "${track.title || "this mix"}". ${errorMessage}`;
          Alert.alert("Audio Error", userFriendlyMessage);
        } finally {
          isPlayingAudioRef.current = false;
        }
      }
    } catch (syncError) {
      isPlayingAudioRef.current = false;
      throw syncError;
    }
  }, [user?.id, likedMixIds, setGlobalAudioState, stateRef]);

  const pauseGlobalAudio = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (globalAudioRef.current) {
        await globalAudioRef.current.pauseAsync();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: false }));
        if (Platform.OS === "android") {
          lockScreenControls.updatePlaybackState(
            false,
            stateRef.current.positionMillis || 0,
            stateRef.current.durationMillis || 0
          );
        }
      }
    } catch (error) {
      if (__DEV__) console.log("❌ Error pausing audio:", error);
    }
  }, [setGlobalAudioState, stateRef]);

  const resumeGlobalAudio = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (globalAudioRef.current) {
        await globalAudioRef.current.playAsync();
        setGlobalAudioState((prev) => ({ ...prev, isPlaying: true }));
        if (Platform.OS === "android") {
          lockScreenControls.updatePlaybackState(
            true,
            stateRef.current.positionMillis || 0,
            stateRef.current.durationMillis || 0
          );
        }
      }
    } catch (error) {
      if (__DEV__) console.log("❌ Error resuming audio:", error);
    }
  }, [setGlobalAudioState, stateRef]);

  const stopGlobalAudio = useCallback(async () => {
    try {
      if (globalAudioRef.current) {
        await globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
        await lockScreenControls.hideNotification();
      }
    } catch (error) {
      if (__DEV__) console.log("❌ Error stopping audio:", error);
    }

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
  }, [setGlobalAudioState]);

  const seekGlobalAudio = useCallback(async (seekAmount) => {
    try {
      if (globalAudioRef.current && stateRef.current.durationMillis) {
        const currentPosition = stateRef.current.positionMillis || 0;
        const newPosition = Math.max(
          0,
          Math.min(
            stateRef.current.durationMillis,
            currentPosition + seekAmount
          )
        );

        await globalAudioRef.current.setPositionAsync(newPosition);
        setGlobalAudioState((prev) => ({
          ...prev,
          positionMillis: newPosition,
        }));
        if (Platform.OS === "android") {
          lockScreenControls.updatePlaybackState(
            stateRef.current.isPlaying,
            newPosition,
            stateRef.current.durationMillis
          );
        }
      }
    } catch (error) {
      if (__DEV__) console.log("❌ Error seeking audio:", error);
    }
  }, [setGlobalAudioState, stateRef]);

  const seekToPosition = useCallback(async (positionMillis) => {
    if (positionMillis < 0) return;

    if (!globalAudioRef.current) return;

    try {
      isScrubbingRef.current = true;

      const status = await globalAudioRef.current.getStatusAsync();

      if (!status.isLoaded) {
        return;
      }

      // expo-av often reports durationMillis === 0 for a while; UI still has metadata duration.
      const st = stateRef.current;
      const metaDur = trackMetaDurationMs(st.currentTrack);
      const nativeDur = status.durationMillis > 0 ? status.durationMillis : 0;
      const stateDur = st.durationMillis > 0 ? st.durationMillis : 0;
      const effectiveDuration = Math.max(nativeDur, stateDur, metaDur);

      if (effectiveDuration <= 0) {
        if (__DEV__) console.warn("⚠️ seekToPosition: no duration yet (native/state/metadata)");
        return;
      }

      const maxSeekPosition = Math.max(0, effectiveDuration - 100);
      const clampedPosition = Math.min(Math.max(0, positionMillis), maxSeekPosition);

      const currentPosition = status.positionMillis || 0;
      const positionDiff = Math.abs(clampedPosition - currentPosition);
      if (positionDiff < 16) {
        return;
      }

      await globalAudioRef.current.setPositionAsync(clampedPosition);

      setGlobalAudioState((prev) => ({
        ...prev,
        positionMillis: clampedPosition,
        progress: effectiveDuration ? clampedPosition / effectiveDuration : 0,
        durationMillis:
          prev.durationMillis > 0 ? prev.durationMillis : effectiveDuration,
      }));
    } catch (error) {
      if (error.message && error.message.includes("interrupted")) {
        if (__DEV__) console.warn("⚠️ Seek was interrupted - this is normal during rapid scrubbing");
      } else {
        if (__DEV__) console.error("❌ Error seeking:", error);
      }
    } finally {
      isScrubbingRef.current = false;
    }
  }, [setGlobalAudioState, stateRef]);

  // ── Queue management ─────────────────────────────────────

  const addToQueue = useCallback((track) => {
    setGlobalAudioState((prev) => {
      const newQueue = [...prev.queue, track];
      if (__DEV__) console.log(`🎵 Added "${track.title}" to queue. Queue length: ${newQueue.length}`);
      return { ...prev, queue: newQueue };
    });
  }, [setGlobalAudioState]);

  const addToQueueAndPlay = useCallback((track) => {
    setGlobalAudioState((prev) => {
      const newQueue = [...prev.queue, track];
      return {
        ...prev,
        queue: newQueue,
        currentQueueIndex: newQueue.length - 1,
      };
    });
    playGlobalAudio(track);
  }, [setGlobalAudioState, playGlobalAudio]);

  const clearQueue = useCallback(() => {
    setGlobalAudioState((prev) => ({
      ...prev,
      queue: [],
      currentQueueIndex: -1,
      isShuffled: false,
    }));
  }, [setGlobalAudioState]);

  const moveQueueItemUp = useCallback((index) => {
    if (index > 0) {
      setGlobalAudioState((prev) => {
        const newQueue = [...prev.queue];
        const [movedItem] = newQueue.splice(index, 1);
        newQueue.splice(index - 1, 0, movedItem);

        let newCurrentIndex = prev.currentQueueIndex;
        if (prev.currentQueueIndex === index) {
          newCurrentIndex = index - 1;
        } else if (prev.currentQueueIndex === index - 1) {
          newCurrentIndex = index;
        }

        HapticPatterns.buttonPress();

        return {
          ...prev,
          queue: newQueue,
          currentQueueIndex: newCurrentIndex,
        };
      });
    }
  }, [setGlobalAudioState]);

  const moveQueueItemDown = useCallback((index) => {
    setGlobalAudioState((prev) => {
      if (index < prev.queue.length - 1) {
        const newQueue = [...prev.queue];
        const [movedItem] = newQueue.splice(index, 1);
        newQueue.splice(index + 1, 0, movedItem);

        let newCurrentIndex = prev.currentQueueIndex;
        if (prev.currentQueueIndex === index) {
          newCurrentIndex = index + 1;
        } else if (prev.currentQueueIndex === index + 1) {
          newCurrentIndex = index;
        }

        HapticPatterns.buttonPress();

        return {
          ...prev,
          queue: newQueue,
          currentQueueIndex: newCurrentIndex,
        };
      }
      return prev;
    });
  }, [setGlobalAudioState]);

  const toggleShuffle = useCallback(() => {
    setGlobalAudioState((prev) => ({
      ...prev,
      isShuffled: !prev.isShuffled,
    }));
  }, [setGlobalAudioState]);

  // ── Like / Unlike ────────────────────────────────────────

  const toggleLike = useCallback(async () => {
    if (!stateRef.current.currentTrack || !user) {
      Alert.alert(
        "Sign In Required",
        "You need to be signed in to like a mix.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const mixId = stateRef.current.currentTrack.id;
      const isCurrentlyLiked = likedMixIds.has(mixId);

      // Optimistically update UI
      setLikedMixIds((prev) => {
        const updated = new Set(prev);
        if (isCurrentlyLiked) {
          updated.delete(mixId);
        } else {
          updated.add(mixId);
        }
        return updated;
      });

      setGlobalAudioState((prev) => ({
        ...prev,
        currentTrack: {
          ...prev.currentTrack,
          isLiked: !isCurrentlyLiked,
        },
      }));

      // Update database
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from("mix_likes")
          .delete()
          .eq("mix_id", mixId)
          .eq("user_id", user.id);

        if (error) {
          if (error.code === "42P01" || error.code === "PGRST205") {
            Alert.alert(
              "Feature Unavailable",
              "Mix likes are not available right now. Please try again later."
            );
            setLikedMixIds((prev) => {
              const updated = new Set(prev);
              updated.add(mixId);
              return updated;
            });
            return;
          }
          throw error;
        }

        // Roll back credits from mix creator
        if (stateRef.current.currentTrack.user_id && stateRef.current.currentTrack.user_id !== user.id) {
          try {
            await db.incrementUserCredits(stateRef.current.currentTrack.user_id, -10);
          } catch (creditError) {
            if (__DEV__) console.error("❌ Error rolling back credits:", creditError);
          }
        }
      } else {
        const { error } = await supabase
          .from("mix_likes")
          .insert([{ mix_id: mixId, user_id: user.id }]);

        if (error) {
          if (error.code === "23505") {
            // Already liked, sync state
          } else if (error.code === "42P01" || error.code === "PGRST205") {
            Alert.alert(
              "Feature Unavailable",
              "Mix likes are not available right now. Please try again later."
            );
            setLikedMixIds((prev) => {
              const updated = new Set(prev);
              updated.delete(mixId);
              return updated;
            });
            return;
          } else {
            throw error;
          }
        } else {
          // Award credits to mix creator
          if (stateRef.current.currentTrack.user_id && stateRef.current.currentTrack.user_id !== user.id) {
            try {
              await db.incrementUserCredits(stateRef.current.currentTrack.user_id, 10);
            } catch (creditError) {
              if (__DEV__) console.error("❌ Error awarding credits:", creditError);
            }
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.error("❌ Error toggling like:", error);
      Alert.alert(
        "Error",
        "We couldn't like this mix right now. Please try again."
      );
      // Revert optimistic update
      const mixId = stateRef.current.currentTrack.id;
      const wasLiked = likedMixIds.has(mixId);
      setLikedMixIds((prev) => {
        const updated = new Set(prev);
        if (wasLiked) {
          updated.add(mixId);
        } else {
          updated.delete(mixId);
        }
        return updated;
      });
      setGlobalAudioState((prev) => ({
        ...prev,
        currentTrack: {
          ...prev.currentTrack,
          isLiked: wasLiked,
        },
      }));
    }
  }, [user, likedMixIds, stateRef, setGlobalAudioState]);

  // ── Track navigation ─────────────────────────────────────

  const getNextTrack = useCallback(() => {
    const currentState = stateRef.current;
    const { queue, currentQueueIndex, repeatMode } = currentState;

    if (queue.length === 0) return null;

    if (repeatMode === "one" && currentState.currentTrack) {
      return currentState.currentTrack;
    }

    let nextIndex;
    if (repeatMode === "all") {
      nextIndex = (currentQueueIndex + 1) % queue.length;
    } else {
      nextIndex = currentQueueIndex + 1;
    }

    if (nextIndex >= queue.length) {
      return null;
    }

    return queue[nextIndex];
  }, [stateRef]);

  const getPreviousTrack = useCallback(() => {
    const currentState = stateRef.current;
    const { queue, currentQueueIndex, repeatMode } = currentState;

    if (queue.length === 0) return null;

    if (repeatMode === "one" && currentState.currentTrack) {
      return currentState.currentTrack;
    }

    let prevIndex;
    if (repeatMode === "all") {
      prevIndex =
        currentQueueIndex === 0 ? queue.length - 1 : currentQueueIndex - 1;
    } else {
      prevIndex = currentQueueIndex - 1;
    }

    if (prevIndex < 0) {
      return null;
    }

    return queue[prevIndex];
  }, [stateRef]);

  const getRandomMix = useCallback(async () => {
    try {
      const currentTrack = stateRef.current.currentTrack;

      let query = supabase
        .from("mixes")
        .select(`
          *,
          user_profiles!mixes_user_id_fkey (
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `)
        .eq("is_public", true)
        .limit(100);

      if (currentTrack?.id) {
        query = query.neq("id", currentTrack.id);
      }

      const { data, error } = await query;

      if (error) {
        if (__DEV__) console.error("Error fetching random mix:", error);
        return null;
      }

      if (!data || data.length === 0) return null;

      const randomMix = data[Math.floor(Math.random() * data.length)];
      const userProfile = randomMix.user_profiles;
      const artistName = userProfile?.dj_name || userProfile?.full_name || "Unknown Artist";

      return {
        id: randomMix.id,
        title: randomMix.title,
        artist: artistName,
        user_dj_name: artistName,
        genre: randomMix.genre || "Electronic",
        image: randomMix.artwork_url || randomMix.image_url || randomMix.image,
        audioUrl: randomMix.file_url,
        duration: randomMix.duration,
        durationSeconds: randomMix.duration,
        user_id: randomMix.user_id,
      };
    } catch (error) {
      if (__DEV__) console.error("Error in getRandomMix:", error);
      return null;
    }
  }, [stateRef]);

  const playNextTrack = useCallback(async () => {
    const currentState = stateRef.current;
    const nextTrack = getNextTrack();

    if (nextTrack) {
      setGlobalAudioState((prev) => ({
        ...prev,
        currentQueueIndex: prev.currentQueueIndex + 1,
      }));
      await playGlobalAudio(nextTrack);
    } else {
      // Queue is empty - try to auto-queue a random mix
      if (__DEV__) console.log("🎵 Queue empty, fetching random mix for auto-queue");
      const randomMix = await getRandomMix();

      if (randomMix) {
        if (__DEV__) console.log("🎵 Auto-queuing random mix:", randomMix.title);
        setGlobalAudioState((prev) => ({
          ...prev,
          queue: [randomMix],
          currentQueueIndex: 0,
        }));
        await playGlobalAudio(randomMix);
      } else if (currentState.queue && currentState.queue.length > 0) {
        const loopTrack = currentState.queue[0];
        const sameAsCurrent =
          currentState.currentTrack &&
          (String(loopTrack?.id) === String(currentState.currentTrack?.id) ||
            (loopTrack?.audioUrl &&
              currentState.currentTrack?.audioUrl &&
              loopTrack.audioUrl === currentState.currentTrack.audioUrl));
        if (sameAsCurrent && globalAudioRef.current) {
          // playGlobalAudio bails when already playing — restart in-place
          try {
            const st = await globalAudioRef.current.getStatusAsync();
            if (st.isLoaded) {
              if (__DEV__) console.log("🎵 Loop same track from beginning (in-place)");
              setGlobalAudioState((prev) => ({ ...prev, currentQueueIndex: 0 }));
              await globalAudioRef.current.setPositionAsync(0);
              await globalAudioRef.current.playAsync();
              setGlobalAudioState((prev) => ({
                ...prev,
                isPlaying: true,
                positionMillis: 0,
                progress: 0,
                currentQueueIndex: 0,
              }));
              return;
            }
          } catch (e) {
            if (__DEV__) console.warn("🎵 In-place loop failed:", e?.message);
          }
        }
        if (__DEV__) console.log("🎵 No random mix available, looping to start of queue");
        setGlobalAudioState((prev) => ({
          ...prev,
          currentQueueIndex: 0,
        }));
        await playGlobalAudio(loopTrack);
      } else if (currentState.currentTrack && globalAudioRef.current) {
        // No next in queue and no random mix: restart current track from 0 so Next / auto-advance still does something
        try {
          const st = await globalAudioRef.current.getStatusAsync();
          if (st.isLoaded) {
            if (__DEV__) console.log("🎵 No next track; restarting current mix from beginning");
            await globalAudioRef.current.setPositionAsync(0);
            await globalAudioRef.current.playAsync();
            setGlobalAudioState((prev) => ({
              ...prev,
              isPlaying: true,
              positionMillis: 0,
              progress: 0,
            }));
            return;
          }
        } catch (e) {
          if (__DEV__) console.warn("🎵 Restart-from-0 fallback failed:", e?.message);
        }
        if (__DEV__) console.log("🎵 No mixes available for auto-queue, stopping playback");
        await stopGlobalAudio();
      } else {
        if (__DEV__) console.log("🎵 No mixes available for auto-queue, stopping playback");
        await stopGlobalAudio();
      }
    }
  }, [stateRef, getNextTrack, getRandomMix, playGlobalAudio, stopGlobalAudio, setGlobalAudioState]);

  const playPreviousTrack = useCallback(async () => {
    const currentState = stateRef.current;
    const prevTrack = getPreviousTrack();
    if (prevTrack) {
      setGlobalAudioState((prev) => ({
        ...prev,
        currentQueueIndex: prev.currentQueueIndex - 1,
      }));
      await playGlobalAudio(prevTrack);
    } else if (currentState.currentTrack) {
      await seekGlobalAudio(-999999);
    }
  }, [stateRef, getPreviousTrack, playGlobalAudio, seekGlobalAudio, setGlobalAudioState]);

  const skipForward = useCallback(async () => {
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
      await playNextTrack();
    } catch (error) {
      if (__DEV__) console.error("❌ Error skipping forward:", error);
    }
  }, [playNextTrack]);

  const skipBackward = useCallback(async () => {
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
      await playPreviousTrack();
    } catch (error) {
      if (__DEV__) console.error("❌ Error skipping backward:", error);
    }
  }, [playPreviousTrack]);

  // ── Shuffle ──────────────────────────────────────────────

  const shuffleAllMixes = useCallback(async (allMixes) => {
    if (!allMixes || allMixes.length === 0) return;

    const shuffled = shuffleArray(allMixes);
    const currentTrack = stateRef.current.currentTrack;

    let queue = shuffled;
    if (currentTrack) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
      } else if (currentIndex === -1) {
        queue = [currentTrack, ...shuffled];
      }
    }

    setGlobalAudioState((prev) => ({
      ...prev,
      queue: queue,
      currentQueueIndex: currentTrack ? 0 : -1,
      isShuffled: true,
    }));
  }, [stateRef, setGlobalAudioState]);

  const shuffleByGenre = useCallback(async (allMixes, genre) => {
    if (!allMixes || allMixes.length === 0) return;

    const genreMixes = allMixes.filter(mix => mix.genre === genre);
    if (genreMixes.length === 0) return;

    const shuffled = shuffleArray(genreMixes);
    const currentTrack = stateRef.current.currentTrack;

    let queue = shuffled;
    if (currentTrack && currentTrack.genre === genre) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
      } else if (currentIndex === -1) {
        queue = [currentTrack, ...shuffled];
      }
    }

    setGlobalAudioState((prev) => ({
      ...prev,
      queue: queue,
      currentQueueIndex: currentTrack && currentTrack.genre === genre ? 0 : -1,
      isShuffled: true,
    }));
  }, [stateRef, setGlobalAudioState]);

  const shuffleBasedOnLikes = useCallback(async (allMixes, userLikedMixIds = []) => {
    if (!allMixes || allMixes.length === 0) return;

    if (!user?.id) {
      return shuffleAllMixes(allMixes);
    }

    try {
      const { getRecommendedMixes } = require("../lib/mixRecommendations");
      const recommended = await getRecommendedMixes(user.id, 50, true);

      if (recommended && recommended.length > 0) {
        const recommendedMixIds = new Set(recommended.map(m => m.id));
        const recommendedMixes = allMixes.filter(mix => recommendedMixIds.has(mix.id));

        const weightedMixes = recommendedMixes.map(mix => {
          const rec = recommended.find(r => r.id === mix.id);
          return {
            ...mix,
            recommendationWeight: rec?.recommendationScore || rec?.recommendation_weight || 0.5,
          };
        });

        const shuffled = weightedShuffle(weightedMixes);
        const currentTrack = stateRef.current.currentTrack;

        let queue = shuffled;
        if (currentTrack) {
          const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
          if (currentIndex > 0) {
            queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
          } else if (currentIndex === -1) {
            queue = [currentTrack, ...shuffled];
          }
        }

        setGlobalAudioState((prev) => ({
          ...prev,
          queue: queue,
          currentQueueIndex: currentTrack ? 0 : -1,
          isShuffled: true,
        }));
        return;
      }
    } catch (error) {
      if (__DEV__) console.error("Error using recommendation system for shuffle:", error);
    }

    // Fallback to genre-based shuffle
    const likedMixes = allMixes.filter(mix => userLikedMixIds.includes(mix.id));
    const likedGenres = new Set(likedMixes.map(mix => mix.genre).filter(Boolean));
    const similarMixes = allMixes.filter(mix =>
      likedGenres.has(mix.genre) || likedMixes.some(liked =>
        liked.genre === mix.genre ||
        (liked.user_id === mix.user_id && liked.id !== mix.id)
      )
    );

    const combined = [...new Map([
      ...likedMixes.map(m => [m.id, m]),
      ...similarMixes.map(m => [m.id, m])
    ]).values()];

    if (combined.length === 0) {
      return shuffleAllMixes(allMixes);
    }

    const shuffled = shuffleArray(combined);
    const currentTrack = stateRef.current.currentTrack;

    let queue = shuffled;
    if (currentTrack) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        queue = [currentTrack, ...shuffled.filter(t => t.id !== currentTrack.id)];
      } else if (currentIndex === -1) {
        queue = [currentTrack, ...shuffled];
      }
    }

    setGlobalAudioState((prev) => ({
      ...prev,
      queue: queue,
      currentQueueIndex: currentTrack ? 0 : -1,
      isShuffled: true,
    }));
  }, [user?.id, stateRef, setGlobalAudioState, shuffleAllMixes]);

  // ── Share ────────────────────────────────────────────────

  const shareTrack = useCallback(async () => {
    if (stateRef.current.currentTrack) {
      try {
        const shareMessage = `Check out this track: "${stateRef.current.currentTrack.title}" by ${stateRef.current.currentTrack.artist} on Rhood!`;
        await Share.share({
          message: shareMessage,
          title: "Share Track",
        });
      } catch (error) {
        if (__DEV__) console.log("Error sharing track:", error);
        Alert.alert("Error", "Failed to share track");
      }
    }
  }, [stateRef]);

  // ── Effects ──────────────────────────────────────────────

  // Clear pending track once context catches up
  useEffect(() => {
    if (audioState.currentTrack?.id && pendingPlayTrack?.id === audioState.currentTrack.id) {
      setPendingPlayTrack(null);
    }
  }, [audioState.currentTrack?.id, pendingPlayTrack?.id]);

  // Fetch liked mixes when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserLikedMixes();
    } else {
      setLikedMixIds(new Set());
    }
  }, [user?.id, fetchUserLikedMixes]);

  // Sync isLiked state when likedMixIds changes
  useEffect(() => {
    if (stateRef.current.currentTrack) {
      const isLiked = likedMixIds.has(stateRef.current.currentTrack.id);
      if (stateRef.current.currentTrack.isLiked !== isLiked) {
        setGlobalAudioState((prev) => ({
          ...prev,
          currentTrack: {
            ...prev.currentTrack,
            isLiked: isLiked,
          },
        }));
      }
    }
  }, [likedMixIds, stateRef, setGlobalAudioState]);

  // Store playNextTrack / playPreviousTrack in refs for background service callbacks
  useEffect(() => {
    playNextTrackRef.current = playNextTrack;
  }, [playNextTrack]);

  useEffect(() => {
    playPreviousTrackRef.current = playPreviousTrack;
  }, [playPreviousTrack]);

  // Populate actionsRef so GlobalAudioPlayerUI and background services can call audio functions
  useLayoutEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        playGlobalAudio,
        pauseGlobalAudio,
        resumeGlobalAudio,
        stopGlobalAudio,
        addToQueue,
        playNextTrack,
        playPreviousTrack,
        clearQueue,
        addToQueueAndPlay,
        skipForward,
        skipBackward,
        toggleLike,
        seekToPosition,
        moveQueueItemUp,
        moveQueueItemDown,
        toggleShuffle,
      };
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (globalAudioRef.current) {
        globalAudioRef.current.unloadAsync();
        globalAudioRef.current = null;
      }
    };
  }, []);

  // ── Return ───────────────────────────────────────────────

  return {
    // State
    audioState,
    pendingPlayTrack,
    audioErrorModal,
    setAudioErrorModal,
    likedMixIds,

    // Playback controls
    playGlobalAudio,
    pauseGlobalAudio,
    resumeGlobalAudio,
    stopGlobalAudio,
    seekToPosition,
    seekGlobalAudio,

    // Queue
    addToQueue,
    addToQueueAndPlay,
    clearQueue,
    moveQueueItemUp,
    moveQueueItemDown,

    // Navigation
    playNextTrack,
    playPreviousTrack,
    skipForward,
    skipBackward,

    // Like
    toggleLike,

    // Shuffle
    toggleShuffle,
    shuffleAllMixes,
    shuffleByGenre,
    shuffleBasedOnLikes,

    // Share
    shareTrack,

    // Refs
    globalAudioRef,
  };
}
