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
  privacyMeta,
  privacyContact,
  privacySections,
} from "../lib/legal/privacyPolicyContent";

const HEADER_SIDE_WIDTH = 48;

function hasText(s) {
  return typeof s === "string" && s.trim().length > 0;
}

export default function PrivacyPolicyScreen({ onBack }) {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.appName}>{privacyMeta.documentTitle}</Text>
          <Text style={styles.effectiveDate}>
            {privacyMeta.effectiveDateLine}
          </Text>
          <Text style={styles.introText}>{privacyMeta.introParagraph}</Text>
        </View>

        {privacySections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {hasText(section.content) ? (
              <Text style={styles.sectionContent}>{section.content}</Text>
            ) : null}
            {section.subsections?.map((subsection, subIndex) => (
              <View key={subIndex} style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{subsection.title}</Text>
                {hasText(subsection.content) ? (
                  <Text style={styles.subsectionContent}>
                    {subsection.content}
                  </Text>
                ) : null}
                {subsection.bullets?.length ? (
                  <View style={styles.bulletList}>
                    {subsection.bullets.map((bullet, bulletIndex) => (
                      <View key={bulletIndex} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            {section.bullets?.length ? (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{privacyContact.sectionTitle}</Text>
          <Text style={styles.contactIntro}>{privacyContact.intro}</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{privacyContact.companyName}</Text>
            <Text style={styles.contactDetail}>{privacyContact.emailLine}</Text>
            <Text style={styles.contactDetail}>
              {privacyContact.websiteLine}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{privacyMeta.copyrightNotice}</Text>
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
    marginBottom: SPACING.md,
  },
  introText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
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
  subsection: {
    marginBottom: SPACING.md,
  },
  subsectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 92%)",
    marginBottom: SPACING.sm,
  },
  subsectionContent: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
    marginBottom: SPACING.sm,
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
  contactIntro: {
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
