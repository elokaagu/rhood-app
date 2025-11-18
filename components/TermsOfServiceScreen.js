import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

export default function TermsOfServiceScreen({ onBack }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.appName}>R/HOOD Terms of Service</Text>
          <Text style={styles.effectiveDate}>Effective Date: October 10, 2025</Text>
          <Text style={styles.website}>Website: www.rhood.io</Text>
        </View>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.introText}>
            Welcome to R/HOOD - a platform designed to help DJs, producers, promoters, and event organizers connect, collaborate, and discover opportunities.
          </Text>
          <Text style={styles.introText}>
            These Terms of Service ("Terms") govern your use of the R/HOOD website, mobile app, and related services (collectively, the "Platform"). By creating an account or using R/HOOD, you agree to these Terms. If you do not agree, you may not use the Platform.
          </Text>
        </View>

        {/* Terms Sections */}
        {termsSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
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

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.contactText}>
            If you have questions about these Terms, contact us at:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>R/HOOD</Text>
            <Text style={styles.contactDetail}>Email: hello@rhood.io</Text>
            <Text style={styles.contactDetail}>Website: www.rhood.io</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 R/HOOD. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const termsSections = [
  {
    title: "1. Overview",
    content: "R/HOOD is a discovery and booking platform that connects creatives and promoters. It allows users to:",
    bullets: [
      "Create professional profiles;",
      "Discover and apply for gigs and collaborations;",
      "Connect with other creators and event organizers; and",
      "Manage opportunities and payments securely."
    ]
  },
  {
    title: "2. Eligibility",
    content: "To use R/HOOD, you must:",
    bullets: [
      "Be at least 16 years old (or the minimum age of digital consent in your country);",
      "Be legally capable of entering into binding contracts; and",
      "Use the Platform in compliance with applicable laws."
    ]
  },
  {
    title: "3. Account Registration",
    content: "When you create an account, you agree to:",
    bullets: [
      "Provide accurate and complete information;",
      "Maintain the security of your login credentials;",
      "Not impersonate another person or entity;",
      "Notify us immediately if you suspect unauthorized access."
    ]
  },
  {
    title: "4. Platform Use",
    content: "You agree to use R/HOOD only for lawful purposes. You may not:",
    bullets: [
      "Upload or share content that is unlawful, defamatory, or discriminatory;",
      "Infringe intellectual property or privacy rights;",
      "Use bots, scrapers, or automated systems;",
      "Circumvent or disrupt the Platform's security features;",
      "Misrepresent your skills, experience, or affiliations."
    ]
  },
  {
    title: "5. User-Generated Content",
    content: "You may upload music, images, text, links, and other materials (\"Content\") to your profile. By posting Content, you grant R/HOOD a non-exclusive, worldwide, royalty-free license to host, display, and distribute it for the purpose of operating and promoting the Platform. You retain full ownership of your Content. You are responsible for ensuring that:",
    bullets: [
      "You own or have permission to post the Content;",
      "It complies with all applicable laws and these Terms."
    ]
  },
  {
    title: "6. Gigs, Bookings, and Payments",
    content: "R/HOOD connects creatives and organizers but is not a party to any agreement between users. Bookings: Any arrangement between a DJ/producer and promoter is at your own risk. Payments: Where supported, payments may be processed through third-party providers (e.g., Stripe, PayPal). Those transactions are governed by the payment provider's terms. Disputes: R/HOOD is not liable for disputes between users, though we may assist in resolving issues in good faith."
  },
  {
    title: "7. Intellectual Property",
    content: "All intellectual property on the Platform — including trademarks, logos, code, and design elements — belongs to R/HOOD or its licensors. You may not reproduce, distribute, or create derivative works from any part of the Platform without written permission."
  },
  {
    title: "8. Privacy",
    content: "Your use of R/HOOD is subject to our Privacy Policy, which explains how we collect, use, and protect your data."
  },
  {
    title: "9. Termination",
    content: "We may suspend or terminate your account at any time if you:",
    bullets: [
      "Violate these Terms or our Privacy Policy;",
      "Engage in fraudulent, abusive, or harmful behavior;",
      "Misuse the Platform in any way."
    ]
  },
  {
    title: "10. Disclaimers",
    content: "R/HOOD provides the Platform on an \"as-is\" and \"as-available\" basis. We do not guarantee that:",
    bullets: [
      "The Platform will be error-free or uninterrupted;",
      "Listings or users are verified or accurate;",
      "Results will meet your expectations."
    ]
  },
  {
    title: "11. Limitation of Liability",
    content: "To the fullest extent permitted by law, R/HOOD and its affiliates are not liable for:",
    bullets: [
      "Loss of profits, data, or goodwill;",
      "Indirect, incidental, or consequential damages;",
      "Any content or interactions between users."
    ]
  },
  {
    title: "12. Indemnification",
    content: "You agree to defend, indemnify, and hold harmless R/HOOD, its affiliates, and team members from any claims, losses, or damages arising from:",
    bullets: [
      "Your use of the Platform;",
      "Your violation of these Terms; or",
      "Your infringement of another's rights."
    ]
  },
  {
    title: "13. Changes to These Terms",
    content: "We may modify these Terms at any time. Updates will be posted on this page with a revised \"Effective Date.\" Continued use of R/HOOD after updates constitutes your acceptance of the revised Terms."
  },
  {
    title: "14. Governing Law",
    content: "These Terms are governed by the laws of England and Wales, without regard to conflict of law principles. Disputes will be resolved exclusively in the courts of London, United Kingdom, unless otherwise required by law."
  }
];

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
  titleSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
  },
  appName: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
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
    fontSize: 18,
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
    fontFamily: "TS Block Bold",
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
