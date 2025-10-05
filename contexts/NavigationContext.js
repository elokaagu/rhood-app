import React, { createContext, useContext, useState, useRef } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState("opportunities");
  const [screenParams, setScreenParams] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);

  // Animation refs
  const fadeOverlayAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(0)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;

  // Navigation functions
  const navigateToScreen = (screen, params = {}) => {
    console.log(`🧭 Navigating to: ${screen}`, params);

    setCurrentScreen(screen);
    setScreenParams(params);
    setShowMenu(false);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeMenu = () => {
    setShowMenu(false);
  };

  const showFadeTransition = () => {
    setShowFadeOverlay(true);
    Animated.timing(fadeOverlayAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideFadeTransition = () => {
    Animated.timing(fadeOverlayAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowFadeOverlay(false);
    });
  };

  const animateMenu = (show) => {
    if (show) {
      Animated.parallel([
        Animated.timing(menuSlideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(menuSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const value = {
    // State
    currentScreen,
    screenParams,
    showMenu,
    showFadeOverlay,
    fadeOverlayAnim,
    menuSlideAnim,
    menuOpacityAnim,

    // Actions
    navigateToScreen,
    toggleMenu,
    closeMenu,
    showFadeTransition,
    hideFadeTransition,
    animateMenu,
    setCurrentScreen,
    setScreenParams,
    setShowMenu,
    setShowFadeOverlay,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
