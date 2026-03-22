/**
 * Full-screen scrubber using [react-native-awesome-slider](https://github.com/alantoa/react-native-awesome-slider)
 * + Reanimated 4. Requires New Architecture (`newArchEnabled: true` in app.json) and a full native rebuild.
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Slider } from "react-native-awesome-slider";
import { COLORS, TYPOGRAPHY, SPACING } from "../lib/sharedStyles";

function formatPlaybackTime(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function FullScreenPlaybackSlider({
  positionMillis = 0,
  durationMillis = 0,
  onSeekToPosition,
  onBeginScrubbing,
}) {
  const progress = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(1);
  /** When true, do not sync `progress` from React props (finger is on the scrubber). */
  const scrubbingRef = useRef(false);

  const ready = durationMillis > 0;

  useEffect(() => {
    max.value = ready ? durationMillis : 1;
    if (!scrubbingRef.current && ready) {
      progress.value = Math.min(Math.max(0, positionMillis), durationMillis);
    }
  }, [positionMillis, durationMillis, ready, progress, max]);

  const handleStart = () => {
    scrubbingRef.current = true;
    onBeginScrubbing?.();
  };

  const handleComplete = async (value) => {
    try {
      if (ready && typeof onSeekToPosition === "function") {
        await onSeekToPosition(value);
      }
    } finally {
      scrubbingRef.current = false;
    }
  };

  return (
    <View
      style={styles.wrap}
      pointerEvents={ready ? "auto" : "none"}
      accessibilityLabel={ready ? "Playback position" : undefined}
    >
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatPlaybackTime(positionMillis)}</Text>
        <Text style={styles.timeText}>
          {ready
            ? `-${formatPlaybackTime(Math.max(0, durationMillis - positionMillis))}`
            : "--:--"}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        progress={progress}
        minimumValue={min}
        maximumValue={max}
        bubble={(v) => formatPlaybackTime(v)}
        onSlidingStart={handleStart}
        onSlidingComplete={handleComplete}
        disable={!ready}
        theme={{
          minimumTrackTintColor: COLORS.primary,
          maximumTrackTintColor: COLORS.TRACK_GREY,
        }}
        sliderHeight={6}
        thumbWidth={14}
        hapticMode="step"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  timeText: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.textTertiary,
    fontVariant: ["tabular-nums"],
  },
  slider: {
    width: "100%",
    height: 40,
  },
});
