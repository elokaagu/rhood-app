import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";
import {
  termsMeta,
  termsIntroParagraphs,
  termsContact,
  termsSections,
} from "../lib/legal/termsContent";

/** Match back button tap area so title centers in the remaining space */
const HEADER_SIDE_WIDTH = 48;

export default function TermsOfServiceScreen({ onBack }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerSide, styles.headerSideLeft]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              HapticPatterns.backButton();
              onBack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleContainer} pointerEvents="none">
          <Text style={styles.headerTitle}>Terms of Service</Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.appName}>{termsMeta.documentTitle}</Text>
          <Text style={styles.effectiveDate}>{termsMeta.effectiveDateLine}</Text>
          <Text style={styles.website}>{termsMeta.websiteLine}</Text>
        </View>

        <View style={styles.section}>
          {termsIntroParagraphs.map((paragraph, i) => (
            <Text key={i} style={styles.introText}>
              {paragraph}
            </Text>
          ))}
        </View>

        {termsSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.content ? (
              <Text style={styles.sectionContent}>{section.content}</Text>
            ) : null}
            {section.bullets && (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{termsContact.sectionTitle}</Text>
          <Text style={styles.contactText}>{termsContact.intro}</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{termsContact.companyName}</Text>
            <Text style={styles.contactDetail}>{termsContact.emailLine}</Text>
            <Text style={styles.contactDetail}>{termsContact.websiteLine}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{termsMeta.copyrightNotice}</Text>
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
  headerSide: {
    width: HEADER_SIDE_WIDTH,
    justifyContent: "center",
  },
  headerSideLeft: {
    alignItems: "flex-start",
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
    minWidth: 0,
  },
  /** Narrow bar: avoid TS Block here — it truncates “Service” on small phones */
  headerTitle: {
    width: "100%",
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.75,
    textTransform: "uppercase",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 0,
    paddingBottom: SPACING["4xl"],
  },
  titleSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  effectiveDate: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  website: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "TS Block Bold",
    color: "hsl(75, 100%, 60%)",
    marginBottom: SPACING.md,
  },
  sectionContent: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  introText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  bulletList: {
    marginTop: SPACING.sm,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.xs,
  },
  bullet: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  contactInfo: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  contactLabel: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: SPACING.xs,
  },
  contactDetail: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    marginBottom: SPACING.xs,
  },
  footer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    textAlign: "center",
  },
});
