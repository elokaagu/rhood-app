import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { useFonts } from "expo-font";
import { Video, ResizeMode } from "expo-av";
import {
  SPLASH_SPINNER_VIDEO,
  SPLASH_LETTERING_WHITE,
  SPLASH_LOGO_FALLBACK,
} from "../lib/splashMedia";

/** Timed brand intro — not a full app-readiness gate (see AuthGate / data loading). */
const SPLASH_VISIBLE_MS = 2200;
const FADE_OUT_MS = 500;
const ENTRANCE_MS = 800;
const ROTATION_START_DELAY_MS = 500;
const ROTATION_DURATION_MS = 4000;

/** Spinning logo / video frame (~20% larger than original 200×200). */
const SPIN_LOGO_SIZE = Math.round(200 * 1.2);
const SPIN_LOGO_FALLBACK_INNER = Math.round(120 * 1.2);

const SplashScreen = ({ onFinish }) => {
  const [fontsLoaded] = useFonts({
    "TS Block Bold": require("../assets/TSBlockBold.ttf"),
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0.35)).current;
  const dot2 = useRef(new Animated.Value(0.35)).current;
  const dot3 = useRef(new Animated.Value(0.35)).current;

  const onFinishRef = useRef(onFinish);
  const introTimeoutRef = useRef(null);
  const rotationDelayRef = useRef(null);
  const rotationLoopRef = useRef(null);
  const dotLoopsRef = useRef([]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ENTRANCE_MS,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const makeDotLoop = (anim, delayMs) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(anim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );

    const loops = [
      makeDotLoop(dot1, 0),
      makeDotLoop(dot2, 160),
      makeDotLoop(dot3, 320),
    ];
    dotLoopsRef.current = loops;
    loops.forEach((l) => l.start());

    introTimeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinishRef.current?.();
      });
    }, SPLASH_VISIBLE_MS);

    return () => {
      if (introTimeoutRef.current != null) {
        clearTimeout(introTimeoutRef.current);
        introTimeoutRef.current = null;
      }
      if (rotationDelayRef.current != null) {
        clearTimeout(rotationDelayRef.current);
        rotationDelayRef.current = null;
      }
      rotationLoopRef.current?.stop?.();
      rotationLoopRef.current = null;
      dotLoopsRef.current.forEach((l) => l.stop?.());
      dotLoopsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only intro; Animated refs are stable
  }, []);

  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!videoError) return;

    const startRotation = () => {
      rotateAnim.setValue(0);
      rotationLoopRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: ROTATION_DURATION_MS,
          useNativeDriver: true,
        })
      );
      rotationLoopRef.current.start();
    };

    rotationDelayRef.current = setTimeout(startRotation, ROTATION_START_DELAY_MS);

    return () => {
      if (rotationDelayRef.current != null) {
        clearTimeout(rotationDelayRef.current);
        rotationDelayRef.current = null;
      }
      rotationLoopRef.current?.stop?.();
      rotationLoopRef.current = null;
    };
  }, [videoError, rotateAnim]);

  const handleVideoError = (error) => {
    if (__DEV__) {
      console.warn("[SplashScreen] Spinner video failed, using static logo:", error);
    }
    setVideoError(true);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          {!videoError ? (
            <Video
              source={SPLASH_SPINNER_VIDEO}
              style={styles.spinningVideo}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              isMuted
              shouldPlay
              onError={handleVideoError}
            />
          ) : null}

          {videoError ? (
            <Animated.View
              style={[
                styles.fallbackContainer,
                { transform: [{ rotate: rotateInterpolate }] },
              ]}
            >
              <Image
                source={SPLASH_LOGO_FALLBACK}
                style={styles.fallbackLogo}
                resizeMode="contain"
              />
            </Animated.View>
          ) : null}
        </View>

        <Image
          source={SPLASH_LETTERING_WHITE}
          style={styles.brandText}
          resizeMode="contain"
        />

        <Text
          style={[
            styles.welcomeText,
            fontsLoaded ? styles.welcomeTextBranded : styles.welcomeTextSystem,
          ]}
        >
          WELCOME TO{"\n"}R/HOOD
        </Text>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, { opacity: dot1 }]} />
            <Animated.View style={[styles.dot, { opacity: dot2 }]} />
            <Animated.View style={[styles.dot, { opacity: dot3 }]} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: SPIN_LOGO_SIZE,
    height: SPIN_LOGO_SIZE,
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  spinningVideo: {
    width: SPIN_LOGO_SIZE,
    height: SPIN_LOGO_SIZE,
  },
  fallbackContainer: {
    width: SPIN_LOGO_SIZE,
    height: SPIN_LOGO_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackLogo: {
    width: SPIN_LOGO_FALLBACK_INNER,
    height: SPIN_LOGO_FALLBACK_INNER,
  },
  brandText: {
    height: 50,
    width: 200,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 40,
  },
  welcomeTextBranded: {
    fontFamily: "TS Block Bold",
  },
  welcomeTextSystem: {
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C2CC06",
    marginHorizontal: 4,
  },
});

export default SplashScreen;
