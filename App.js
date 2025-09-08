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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SplashScreen from "./components/SplashScreen";

// Music genres for selection
const MUSIC_GENRES = [
  "House",
  "Techno",
  "Drum & Bass",
  "Dubstep",
  "Trap",
  "Hip-Hop",
  "Electronic",
  "Progressive",
  "Trance",
  "Ambient",
  "Breakbeat",
];

// Major music cities
const MAJOR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Miami",
  "San Francisco",
  "Berlin",
  "London",
  "Amsterdam",
  "Ibiza",
  "Barcelona",
  "Tokyo",
  "Sydney",
  "Toronto",
  "Montreal",
  "Vancouver",
  "Paris",
  "Madrid",
  "Rome",
  "Stockholm",
  "Copenhagen",
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("home");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
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

  const toggleGenre = (genre) => {
    setDjProfile((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const selectCity = (city) => {
    setDjProfile((prev) => ({ ...prev, city }));
    setShowCityDropdown(false);
  };

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
      await AsyncStorage.setItem("hasOnboarded", "true");
      await AsyncStorage.setItem("djProfile", JSON.stringify(djProfile));
      setIsFirstTime(false);
      Alert.alert("Success", "Welcome to R/HOOD!");
    } catch (error) {
      Alert.alert("Error", "Failed to save profile");
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
      <SafeAreaView style={[styles.container, styles.onboarding]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.center}>
            <Text style={styles.title}>Welcome to R/HOOD!</Text>
            <Text style={styles.subtitle}>
              Join the Underground Music Network
            </Text>

            <View style={styles.form}>
              <Text style={styles.formTitle}>Create Your Profile</Text>

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={djProfile.fullName}
                onChangeText={(text) =>
                  setDjProfile((prev) => ({ ...prev, fullName: text }))
                }
              />

              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>⚡</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>DJ Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your DJ stage name"
                    value={djProfile.djName}
                    onChangeText={(text) =>
                      setDjProfile((prev) => ({ ...prev, djName: text }))
                    }
                  />
                </View>
              </View>

              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>📷</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Instagram</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="@yourhandle or full URL"
                    value={djProfile.instagram}
                    onChangeText={(text) =>
                      setDjProfile((prev) => ({ ...prev, instagram: text }))
                    }
                  />
                </View>
              </View>

              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>☁️</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>SoundCloud</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your SoundCloud URL"
                    value={djProfile.soundcloud}
                    onChangeText={(text) =>
                      setDjProfile((prev) => ({ ...prev, soundcloud: text }))
                    }
                  />
                </View>
              </View>

              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>📍</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>City</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowCityDropdown(!showCityDropdown)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !djProfile.city && styles.placeholderText,
                      ]}
                    >
                      {djProfile.city || "Select your city"}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>

                  {showCityDropdown && (
                    <View style={styles.dropdown}>
                      {MAJOR_CITIES.map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={styles.dropdownItem}
                          onPress={() => selectCity(city)}
                        >
                          <Text style={styles.dropdownItemText}>{city}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>🎵</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Your Genres</Text>
                  <View style={styles.genreContainer}>
                    {MUSIC_GENRES.map((genre) => (
                      <TouchableOpacity
                        key={genre}
                        style={[
                          styles.genreTag,
                          djProfile.genres.includes(genre) &&
                            styles.genreTagSelected,
                        ]}
                        onPress={() => toggleGenre(genre)}
                      >
                        <Text
                          style={[
                            styles.genreTagText,
                            djProfile.genres.includes(genre) &&
                              styles.genreTagTextSelected,
                          ]}
                        >
                          {genre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={completeOnboarding}
            >
              <Text style={styles.buttonText}>Request Access</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "feed":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>Underground Feed</Text>
            <View style={styles.eventCard}>
              <Text style={styles.eventDJ}>DJ Pulse</Text>
              <Text style={styles.eventTitle}>Friday Night Vibes</Text>
              <Text style={styles.eventInfo}>Club Neon, Miami</Text>
              <Text style={styles.eventInfo}>10:00 PM • House Music</Text>
              <View style={styles.eventActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.eventCard}>
              <Text style={styles.eventDJ}>Luna Beats</Text>
              <Text style={styles.eventTitle}>Techno Underground</Text>
              <Text style={styles.eventInfo}>The Warehouse, Berlin</Text>
              <Text style={styles.eventInfo}>11:30 PM • Techno</Text>
              <View style={styles.eventActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );

      case "messages":
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>Messages</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageName}>House Music Lovers</Text>
              <Text style={styles.messagePreview}>
                Who's going to the festival this weekend?
              </Text>
              <Text style={styles.messageTime}>156 members • 2m ago</Text>
            </View>

            <View style={styles.messageCard}>
              <Text style={styles.messageName}>DJ Pulse</Text>
              <Text style={styles.messagePreview}>
                Thanks for the collaboration!
              </Text>
              <Text style={styles.messageTime}>1h ago</Text>
            </View>

            <View style={styles.messageCard}>
              <Text style={styles.messageName}>Miami DJ Network</Text>
              <Text style={styles.messagePreview}>
                Looking for a resident DJ at our venue
              </Text>
              <Text style={styles.messageTime}>234 members • 1d ago</Text>
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

      default:
        return (
          <ScrollView style={styles.screen}>
            <Text style={styles.screenTitle}>R/HOOD</Text>
            <Text style={styles.welcomeText}>
              Welcome {djProfile.djName}! Your social networking app for DJs is
              ready.
            </Text>

            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>Features Available:</Text>
              <Text style={styles.featureItem}>DJ Feed with event cards</Text>
              <Text style={styles.featureItem}>Forum-style messaging</Text>
              <Text style={styles.featureItem}>Complete DJ profiles</Text>
              <Text style={styles.featureItem}>Community features</Text>
              <Text style={styles.featureItem}>Admin panel</Text>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>R/HOOD</Text>
      </View>

      {renderScreen()}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, currentScreen === "home" && styles.activeTab]}
          onPress={() => setCurrentScreen("home")}
        >
          <Text
            style={[
              styles.tabText,
              currentScreen === "home" && styles.activeTabText,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === "feed" && styles.activeTab]}
          onPress={() => setCurrentScreen("feed")}
        >
          <Text
            style={[
              styles.tabText,
              currentScreen === "feed" && styles.activeTabText,
            ]}
          >
            Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === "messages" && styles.activeTab]}
          onPress={() => setCurrentScreen("messages")}
        >
          <Text
            style={[
              styles.tabText,
              currentScreen === "messages" && styles.activeTabText,
            ]}
          >
            Messages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === "profile" && styles.activeTab]}
          onPress={() => setCurrentScreen("profile")}
        >
          <Text
            style={[
              styles.tabText,
              currentScreen === "profile" && styles.activeTabText,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)", // Pure black background
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
  },
  headerTitle: {
    color: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
    fontSize: 24,
    fontFamily: "Arial Black",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    // Removed glow effects
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
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 5,
    color: "hsl(0, 0%, 100%)", // Pure white
  },
  inputContainer: {
    flex: 1,
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
  },
  activeTab: {
    backgroundColor: "hsl(75, 100%, 60%)", // R/HOOD signature lime color
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)", // Muted foreground
  },
  activeTabText: {
    color: "hsl(0, 0%, 0%)", // Black text on active tab
    fontWeight: "bold",
  },
});
