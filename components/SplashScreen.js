import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { Video } from "expo-av";
import { useFonts } from "expo-font";

const { width, height } = Dimensions.get("window");

const SplashScreen = ({ onFinish }) => {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "TS-Block-Bold": require("../assets/TS Block Bold.ttf"),
  });

  // Initialize video player for Legacy Architecture
  const [videoStatus, setVideoStatus] = useState({});

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [progressAnim] = useState(new Animated.Value(0));
  const [dotAnim1] = useState(new Animated.Value(0.3));
  const [dotAnim2] = useState(new Animated.Value(0.3));
  const [dotAnim3] = useState(new Animated.Value(0.3));
  const [loadingText, setLoadingText] = useState("Initializing...");

  useEffect(() => {
    // Video will auto-play with shouldPlay={true}

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Loading progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // Loading dots pulsing animation
    const createDotPulse = (dotAnim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 600,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createDotPulse(dotAnim1, 0).start();
    createDotPulse(dotAnim2, 200).start();
    createDotPulse(dotAnim3, 400).start();

    // Loading text sequence
    const textSequence = [
      "Initializing...",
      "Loading R/HOOD...",
      "Connecting to underground...",
      "Preparing your experience...",
    ];

    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex++;
      if (textIndex < textSequence.length) {
        setLoadingText(textSequence[textIndex]);
      } else {
        clearInterval(textInterval);
      }
    }, 800);

    // Auto-hide splash screen after 5 seconds
    const timer = setTimeout(() => {
      console.log("🎬 SplashScreen: Starting fade out animation");
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        console.log("🎬 SplashScreen: Fade out complete, calling onFinish");
        if (onFinish) onFinish();
      });
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(textInterval);
      // Video cleanup handled by component unmount
    };
  }, []);

  // Wait for fonts to load
  if (!fontsLoaded) {
    console.log("⏳ SplashScreen: Waiting for fonts to load...");
    return null;
  }

  console.log("✅ SplashScreen: Fonts loaded, rendering splash screen");

  // Removed glow opacity interpolation

  return (
    <View style={styles.container}>
      {/* Content Overlay */}
      <Animated.View
        style={[
          styles.contentOverlay,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Smaller Spinning Logo Above Text */}
        <View style={styles.spinnerContainer}>
          <Video
            source={require("../assets/RHOOD_Logo_Spinner.mov")}
            style={styles.spinnerVideo}
            shouldPlay={true}
            isLooping={true}
            isMuted={true}
            resizeMode="contain"
            onPlaybackStatusUpdate={setVideoStatus}
          />
        </View>

        <Image
          source={require("../assets/RHOOD_Lettering_White.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.tsBlockBoldSubtitle}>
          WELCOME{"\n"}TO{"\n"}R/HOOD
        </Text>

        {/* Loading Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>

        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingDot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.loadingDot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.loadingDot, { opacity: dotAnim3 }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "#000000", // Pure black background
  },
  contentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 0, // Remove top padding to center content
  },
  spinnerContainer: {
    width: 480,
    height: 480,
    marginBottom: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerVideo: {
    width: 480,
    height: 480,
  },
  logoImage: {
    height: 60,
    width: 220,
    marginBottom: 10,
  },
  tsBlockBoldSubtitle: {
    fontFamily: "TS-Block-Bold",
    fontSize: 24,
    color: "#FFFFFF", // Brand white
    textAlign: "center", // Center aligned for splash screen
    textTransform: "uppercase", // Always uppercase
    lineHeight: 28, // Tight line height for stacked effect
    letterSpacing: 1, // Slight spacing for impact
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "#FFFFFF", // Brand white
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 30,
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 19.2, // 120% of 16pt
    textTransform: "uppercase",
  },
  progressContainer: {
    width: "80%",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "hsl(0, 0%, 15%)", // Dark background
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C2CC06", // Brand lime green
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "300", // Light weight
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    letterSpacing: 0, // Tracking set to 0
    lineHeight: 16.8, // 120% of 14pt
  },
  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C2CC06", // Brand lime green
    marginHorizontal: 6,
  },
});

export default SplashScreen;
