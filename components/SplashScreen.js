import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const SplashScreen = ({ onFinish }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [progressAnim] = useState(new Animated.Value(0));
  const [dotAnim1] = useState(new Animated.Value(0.3));
  const [dotAnim2] = useState(new Animated.Value(0.3));
  const [dotAnim3] = useState(new Animated.Value(0.3));
  const [loadingText, setLoadingText] = useState("Initializing...");

  useEffect(() => {
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
      "Ready to rock!",
    ];

    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex++;
      if (textIndex < textSequence.length) {
        setLoadingText(textSequence[textIndex]);
      } else {
        clearInterval(textInterval);
      }
    }, 600);

    // Auto-hide splash screen after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(textInterval);
    };
  }, []);

  // Removed glow opacity interpolation

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["hsl(0, 0%, 0%)", "hsl(0, 0%, 5%)"]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>R/HOOD</Text>
          </View>
          <Text style={styles.subtitle}>Underground Music Platform</Text>

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
      </LinearGradient>
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
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    // Removed glow effects
  },
  title: {
    fontSize: 56,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 2,
    // Removed glow effects
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 64,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  progressContainer: {
    width: "80%",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
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
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    marginHorizontal: 6,
  },
});

export default SplashScreen;
