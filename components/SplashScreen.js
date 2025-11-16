import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { useFonts } from "expo-font";

// Conditionally import Video (not available in Expo Go)
let Video;
let VideoAvailable = false;
try {
  Video = require("expo-video").Video;
  VideoAvailable = true;
} catch (error) {
  // Video not available in Expo Go
  VideoAvailable = false;
}

const { width, height } = Dimensions.get("window");

const SplashScreen = ({ onFinish }) => {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "TS-Block-Bold": require("../assets/TS Block Bold.ttf"),
  });

  // Animation states
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Refs
  const videoRef = useRef(null);

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start continuous rotation animation
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();
    };

    // Start rotation after a short delay
    setTimeout(startRotation, 500);

    // Auto-hide splash screen after 4 seconds
    const timer = setTimeout(() => {
      console.log("🎬 SplashScreen: Starting fade out animation");
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        console.log("🎬 SplashScreen: Fade out complete, calling onFinish");
        if (onFinish) onFinish();
      });
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Handle video load
  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  // Handle video error
  const handleVideoError = (error) => {
    setVideoError(true);
  };

  // Don't block rendering if fonts aren't ready; fall back to system font

  // Calculate rotation transform
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
        {/* Spinning Logo Container */}
        <View style={styles.logoContainer}>
          {VideoAvailable && Video && !videoError ? (
            <Video
              ref={videoRef}
              source={require("../assets/RHOOD_Logo_Spinner.mov")}
              style={styles.spinningVideo}
              shouldPlay={true}
              isLooping={true}
              isMuted={true}
              resizeMode="contain"
              onLoad={handleVideoLoad}
              onError={handleVideoError}
            />
          ) : (
            <Animated.View
              style={[
                styles.fallbackContainer,
                {
                  transform: [{ rotate: rotateInterpolate }],
                },
              ]}
            >
              <Image
                source={require("../assets/rhood_logo.png")}
                style={styles.fallbackLogo}
                resizeMode="contain"
              />
            </Animated.View>
          )}
        </View>

        {/* R/HOOD Text */}
        <Image
          source={require("../assets/RHOOD_Lettering_White.png")}
          style={styles.brandText}
          resizeMode="contain"
        />

        {/* Welcome Text */}
        <Text style={styles.welcomeText}>WELCOME TO{"\n"}R/HOOD</Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
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
    width: 200,
    height: 200,
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  spinningVideo: {
    width: 200,
    height: 200,
  },
  fallbackContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackLogo: {
    width: 120,
    height: 120,
  },
  brandText: {
    height: 50,
    width: 200,
    marginBottom: 20,
  },
  welcomeText: {
    fontFamily: "TS-Block-Bold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 40,
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
  dot1: {
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },
});

export default SplashScreen;
