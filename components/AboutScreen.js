import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

export default function AboutScreen({ onBack }) {
  const handleOpenLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open link");
    });
  };

  const aboutSections = [
    {
      title: "About R/HOOD",
      items: [
        {
          title: "Version",
          value: "1.0.0",
        },
        {
          title: "Build",
          value: "2024.01",
        },
        {
          title: "Platform",
          value: "iOS & Android",
        },
      ],
    },
    {
      title: "Company",
      items: [
        {
          title: "Website",
          value: "rhood.app",
          type: "link",
          url: "https://rhood.app",
        },
        {
          title: "Support",
          value: "support@rhood.app",
          type: "email",
          url: "mailto:support@rhood.app",
        },
        {
          title: "Partnership",
          value: "partners@rhood.app",
          type: "email",
          url: "mailto:partners@rhood.app",
        },
      ],
    },
    {
      title: "Legal",
      items: [
        {
          title: "Privacy Policy",
          value: "Read our privacy policy",
          type: "link",
          url: "https://rhood.app/privacy",
        },
        {
          title: "Terms of Service",
          value: "Read our terms of service",
          type: "link",
          url: "https://rhood.app/terms",
        },
        {
          title: "Open Source Licenses",
          value: "View third-party licenses",
          type: "action",
          action: () => Alert.alert("Open Source", "Third-party licenses will be shown here"),
        },
      ],
    },
    {
      title: "Connect",
      items: [
        {
          title: "Instagram",
          value: "@rhoodapp",
          type: "link",
          url: "https://instagram.com/rhoodapp",
        },
        {
          title: "Twitter",
          value: "@rhoodapp",
          type: "link",
          url: "https://twitter.com/rhoodapp",
        },
        {
          title: "Discord",
          value: "Join our community",
          type: "link",
          url: "https://discord.gg/rhood",
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info Card */}
        <LinearGradient
          colors={["hsl(0, 0%, 8%)", "hsl(0, 0%, 12%)"]}
          style={styles.appInfoCard}
        >
          <View style={styles.appIconContainer}>
            <View style={styles.appIcon}>
              <Ionicons name="musical-notes" size={32} color="hsl(75, 100%, 60%)" />
            </View>
          </View>
          <Text style={styles.appName}>R/HOOD</Text>
          <Text style={styles.appTagline}>
            Connecting underground DJs with opportunities
          </Text>
          <Text style={styles.appDescription}>
            R/HOOD is the premier platform for discovering gig opportunities, 
            connecting with fellow DJs, and building your underground music career.
          </Text>
        </LinearGradient>

        {/* About Sections */}
        {aboutSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.itemRow}
                  onPress={() => {
                    if (item.type === "link" || item.type === "email") {
                      handleOpenLink(item.url);
                    } else if (item.type === "action") {
                      item.action();
                    }
                  }}
                  disabled={!item.type}
                  activeOpacity={item.type ? 0.7 : 1}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemValue}>{item.value}</Text>
                  </View>
                  {item.type && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="hsl(0, 0%, 60%)"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for the underground music community
          </Text>
          <Text style={styles.footerCopyright}>
            © 2024 R/HOOD. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: 20,
    marginLeft: SPACING.md,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  appInfoCard: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  appIconContainer: {
    marginBottom: SPACING.md,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 28,
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    marginBottom: SPACING.sm,
  },
  appTagline: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  appDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: SPACING.md,
  },
  sectionContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  footer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  footerCopyright: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    textAlign: "center",
  },
});
