import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import SplashScreen from "./components/SplashScreen";
import OnboardingForm from "./components/OnboardingForm";
import OpportunitiesList from "./components/OpportunitiesList";
import OpportunitiesSwipe from "./components/OpportunitiesSwipe";
import ConnectionsScreen from "./components/ConnectionsScreen";
import ListenScreen from "./components/ListenScreen";
import MessagesScreen from "./components/MessagesScreen";
import ScreenTransition from "./components/ScreenTransition";
import { db } from "./lib/supabase";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("opportunities");
  const [screenParams, setScreenParams] = useState({});
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [djProfile, setDjProfile] = useState({
    djName: "",
    fullName: "",
    instagram: "",
    soundcloud: "",
    city: "",
    genres: [],
  });

  useEffect(() => {
    checkFirstTime();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const loadOpportunities = async () => {
    try {
      setLoadingOpportunities(true);
      const data = await db.getOpportunities();
      setOpportunities(data);
    } catch (error) {
      console.error("Error loading opportunities:", error);
      Alert.alert(
        "Error",
        "Failed to load opportunities. Please check your internet connection."
      );
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const applyToOpportunity = async (opportunityId) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please complete your profile first.");
        return;
      }

      await db.applyToOpportunity(opportunityId, userId);
      Alert.alert("Success", "Application submitted successfully!");
    } catch (error) {
      console.error("Error applying to opportunity:", error);
      Alert.alert("Error", "Failed to submit application. Please try again.");
    }
  };

  // Load opportunities when opportunities screen is accessed
  useEffect(() => {
    if (currentScreen === "opportunities") {
      loadOpportunities();
    }
  }, [currentScreen]);

  const checkFirstTime = async () => {
    try {
      const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
      const profile = await AsyncStorage.getItem("djProfile");

      setIsFirstTime(!hasOnboarded);
      if (profile) {
        setDjProfile(JSON.parse(profile));
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuNavigation = (screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
    setShowMenu(false);
  };

  const completeOnboarding = async () => {
    if (
      !djProfile.djName ||
      !djProfile.fullName ||
      !djProfile.city ||
      djProfile.genres.length === 0
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields: DJ name, full name, city, and at least one genre"
      );
      return;
    }

    try {
      // Save to Supabase
      const profileData = {
        dj_name: djProfile.djName,
        full_name: djProfile.fullName,
        instagram: djProfile.instagram || null,
        soundcloud: djProfile.soundcloud || null,
        city: djProfile.city,
        genres: djProfile.genres,
        bio: `DJ from ${djProfile.city} specializing in ${djProfile.genres.join(
          ", "
        )}`,
      };

      const savedProfile = await db.createUserProfile(profileData);

      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      await AsyncStorage.setItem("userId", savedProfile.id);

      setIsFirstTime(false);
      Alert.alert(
        "Success",
        "Welcome to R/HOOD! Your profile has been saved to the cloud."
      );
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert(
        "Error",
        "Failed to save profile. Please check your internet connection and try again."
      );
    }
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>R/HOOD</Text>
          <Text style={styles.subtitle}>Underground Music Platform</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isFirstTime) {
    return (
      <SafeAreaView style={styles.container}>
        <OnboardingForm
          onComplete={completeOnboarding}
          djProfile={djProfile}
          setDjProfile={setDjProfile}
        />
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    const screens = [
      "opportunities",
      "connections", 
      "listen",
      "messages",
      "notifications",
      "community",
      "profile",
      "settings"
    ];

    return (
      <View style={styles.screenContainer}>
        {screens.map((screen) => {
          const isActive = currentScreen === screen;
          let transitionType = 'fade';
          let direction = 'up';

          // Different transition types for different screens
          if (screen === 'opportunities' || screen === 'connections' || screen === 'listen') {
            transitionType = 'slideFade';
            direction = 'up';
          } else if (screen === 'messages') {
            transitionType = 'slide';
            direction = 'up';
          } else {
            transitionType = 'fade';
          }

          return (
            <ScreenTransition
              key={screen}
              isActive={isActive}
              transitionType={transitionType}
              direction={direction}
              duration={300}
            >
              {renderScreenContent(screen)}
            </ScreenTransition>
          );
        })}
      </View>
    );
  };

  const renderScreenContent = (screen) => {
    switch (screen) {
      case "opportunities":
        return (
          <OpportunitiesSwipe
            onApply={(opportunity) => {
              console.log("Applied to:", opportunity.name);
              Alert.alert(
                "Application Sent",
                `You've applied to ${opportunity.name}!`
              );
            }}
            onPass={(opportunity) => {
              console.log("Passed on:", opportunity.name);
            }}
          />
        );

      case "connections":
        return (
          <ConnectionsScreen 
            onNavigate={(screen, params = {}) => {
              setCurrentScreen(screen);
              setScreenParams(params);
            }}
          />
        );

      case "listen":
        return <ListenScreen />;

      case "messages":
        return (
          <MessagesScreen 
            navigation={{ goBack: () => setCurrentScreen("home") }}
            route={{ params: screenParams }}
          />
        );

      case "notifications":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>Notifications</Text>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>New Opportunity</Text>
              <Text style={styles.notificationText}>
                Underground Warehouse Rave is looking for DJs
              </Text>
              <Text style={styles.notificationTime}>2 hours ago</Text>
            </View>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>Application Accepted</Text>
              <Text style={styles.notificationText}>
                Your application for Club Neon has been accepted
              </Text>
              <Text style={styles.notificationTime}>1 day ago</Text>
            </View>
            <View style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>New Message</Text>
              <Text style={styles.notificationText}>
                You have a new message from Darkside Collective
              </Text>
              <Text style={styles.notificationTime}>3 days ago</Text>
            </View>
          </ScrollView>
        );

      case "community":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>Community</Text>
            <View style={styles.communityCard}>
              <Text style={styles.communityTitle}>Underground DJs</Text>
              <Text style={styles.communityMembers}>1,234 members</Text>
              <Text style={styles.communityDescription}>
                Connect with underground DJs worldwide
              </Text>
            </View>
            <View style={styles.communityCard}>
              <Text style={styles.communityTitle}>Techno Collective</Text>
              <Text style={styles.communityMembers}>856 members</Text>
              <Text style={styles.communityDescription}>
                Share techno tracks and collaborate
              </Text>
            </View>
            <View style={styles.communityCard}>
              <Text style={styles.communityTitle}>Miami Music Scene</Text>
              <Text style={styles.communityMembers}>432 members</Text>
              <Text style={styles.communityDescription}>
                Local Miami DJs and producers
              </Text>
            </View>
          </ScrollView>
        );

      case "profile":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>Your Profile</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileDJ}>
                {djProfile.djName || "Your DJ Name"}
              </Text>
              <Text style={styles.profileName}>
                {djProfile.fullName || "Your Full Name"}
              </Text>
              <Text style={styles.profileCity}>
                {djProfile.city || "Your City"}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>12</Text>
                  <Text style={styles.statLabel}>Events</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>156</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>89</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case "settings":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>Settings</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Account</Text>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Edit Profile</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Privacy Settings</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>
                  Notification Preferences
                </Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>App</Text>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Theme</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>Language</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText}>About R/HOOD</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default:
        return (
          <OpportunitiesSwipe
            onApply={(opportunity) => {
              console.log("Applied to:", opportunity.name);
              Alert.alert(
                "Application Sent",
                `You've applied to ${opportunity.name}!`
              );
            }}
            onPass={(opportunity) => {
              console.log("Passed on:", opportunity.name);
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>R/HOOD</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="menu" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
      </View>

      {renderScreen()}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            currentScreen === "opportunities" && styles.activeTab,
          ]}
          onPress={() => handleMenuNavigation("opportunities")}
        >
          <Ionicons
            name="briefcase-outline"
            size={20}
            color={currentScreen === "opportunities" ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"}
          />
          <Text
            style={[
              styles.tabText,
              currentScreen === "opportunities" && styles.activeTabText,
            ]}
          >
            Opportunities
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === "connections" && styles.activeTab]}
          onPress={() => handleMenuNavigation("connections")}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={currentScreen === "connections" ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"}
          />
          <Text
            style={[
              styles.tabText,
              currentScreen === "connections" && styles.activeTabText,
            ]}
          >
            Connections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === "listen" && styles.activeTab]}
          onPress={() => handleMenuNavigation("listen")}
        >
          <Ionicons
            name="musical-notes-outline"
            size={20}
            color={currentScreen === "listen" ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"}
          />
          <Text
            style={[
              styles.tabText,
              currentScreen === "listen" && styles.activeTabText,
            ]}
          >
            Listen
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowMenu(false)}
                >
                  <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.menuItems}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("messages")}
                >
                  <Ionicons name="chatbubbles-outline" size={20} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.menuItemText}>Messages</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("notifications")}
                >
                  <Ionicons name="notifications-outline" size={20} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.menuItemText}>Notifications</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("community")}
                >
                  <Ionicons name="people-outline" size={20} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.menuItemText}>Community</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("profile")}
                >
                  <Ionicons name="person-outline" size={20} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuNavigation("settings")}
                >
                  <Ionicons name="settings-outline" size={20} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.menuItemText}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black background
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
  },
  onboarding: {
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black background
  },
  scrollContent: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    fontSize: 18,
    fontFamily: "Arial Black",
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent", // Transparent background
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)", // Subtle border
  },
  headerIconText: {
    fontSize: 16,
    color: "hsl(0, 0%, 100%)", // Pure white
    fontWeight: "300",
  },
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black background
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
    // Removed glow effects
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  form: {
    width: "100%",
    marginBottom: 30,
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  formTitle: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)", // Input background
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  dropdownButton: {
    backgroundColor: "hsl(0, 0%, 10%)", // Input background
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
    flex: 1,
  },
  placeholderText: {
    color: "hsl(0, 0%, 50%)", // Muted text for placeholder
  },
  dropdownArrow: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  dropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  genreTagSelected: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    borderColor: "hsl(75, 100%, 60%)",
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
  },
  genreTagTextSelected: {
    color: "hsl(0, 0%, 0%)", // Black text on selected
  },
  button: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 15,
    // Removed glow effects
  },
  buttonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 15,
  },
  featureItem: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 20,
  },
  eventCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
    // Removed glow effects
  },
  eventDJ: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 8,
  },
  eventInfo: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 4,
  },
  eventActions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
  },
  messageCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  messageName: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 5,
  },
  messagePreview: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)", // More muted text
  },
  profileCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  profileDJ: {
    fontSize: 24,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    marginBottom: 5,
    // Removed glow effects
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 5,
  },
  profileCity: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  editButton: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    // Removed glow effects
  },
  editButtonText: {
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
  },
  activeTab: {
    backgroundColor: "hsl(0, 0%, 10%)", // Slightly lighter background for active tab
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  activeTabText: {
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color for active text
    fontWeight: "600",
  },
  // Opportunities Screen Styles
  featuredOpportunityCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  opportunityImageContainer: {
    position: "relative",
    height: 200,
    backgroundColor: "hsl(0, 0%, 10%)", // Dark background for image placeholder
    justifyContent: "center",
    alignItems: "center",
  },
  opportunityImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
  },
  opportunityImageText: {
    fontSize: 40,
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
  },
  genreTag: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "hsl(0, 0%, 0%)", // Black background
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontWeight: "bold",
  },
  opportunityContent: {
    padding: 20,
  },
  opportunityTitle: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 10,
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    lineHeight: 20,
    marginBottom: 15,
  },
  opportunityDetails: {
    marginBottom: 15,
  },
  opportunityDetail: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 5,
  },
  opportunityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillLevelTag: {
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillLevelText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontWeight: "bold",
  },
  organizerName: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    fontWeight: "bold",
  },
  opportunityActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    gap: 40,
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 15%)", // Muted background
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 25%)",
  },
  passButtonText: {
    fontSize: 24,
    color: "hsl(0, 0%, 100%)", // Pure white text
    fontWeight: "bold",
  },
  applyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 24,
    color: "hsl(0, 0%, 0%)", // Black text on primary
    fontWeight: "bold",
  },
  actionHint: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)", // Muted text
    textAlign: "center",
    marginBottom: 30,
  },
  opportunityCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  opportunityDJ: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    marginBottom: 5,
  },
  opportunityInfo: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 4,
  },
  // Notifications Screen Styles
  notificationCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)", // Pure white text
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 50%)", // More muted text
  },
  // Community Screen Styles
  communityCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  communityTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    marginBottom: 5,
  },
  communityMembers: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
    lineHeight: 20,
  },
  // Settings Screen Styles
  settingsCard: {
    backgroundColor: "hsl(0, 0%, 5%)", // Dark card background
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  settingsTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)", // Subtle border
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 10%)", // Very subtle border
  },
  settingsItemText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)", // Pure white text
  },
  settingsArrow: {
    fontSize: 18,
    color: "hsl(0, 0%, 50%)", // Muted text
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Arial",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
    fontFamily: "Arial",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Arial",
  },
  // Hamburger Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  menuContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    borderBottomWidth: 0,
  },
  menuContent: {
    padding: 20,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  menuTitle: {
    fontSize: 20,
    fontFamily: "Arial Black",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItems: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 12,
    fontWeight: "500",
  },
});
