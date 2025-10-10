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

export default function PrivacyPolicyScreen({ onBack }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.appName}>R/HOOD Privacy Policy</Text>
          <Text style={styles.effectiveDate}>Effective Date: October 10, 2025</Text>
          <Text style={styles.introText}>
            R/HOOD ("we," "our," "us") values your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our website, mobile app, and related services (collectively, the "Platform").
          </Text>
        </View>

        {/* Policy Sections */}
        {privacySections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
            {section.subsections && section.subsections.map((subsection, subIndex) => (
              <View key={subIndex} style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{subsection.title}</Text>
                <Text style={styles.subsectionContent}>{subsection.content}</Text>
                {subsection.bullets && (
                  <View style={styles.bulletList}>
                    {subsection.bullets.map((bullet, bulletIndex) => (
                      <View key={bulletIndex} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
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
            If you have any questions or concerns about this Privacy Policy, contact us at:
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

const privacySections = [
  {
    title: "1. Information We Collect",
    subsections: [
      {
        title: "1.1. Information You Provide",
        content: "",
        bullets: [
          "Account Information: When you create an account, we collect your name, email address, phone number, username, password, and optional profile details (bio, links, genre preferences, etc.).",
          "Professional Data: DJs and producers may choose to share music links, portfolios, social handles, or gig preferences.",
          "Payment Details: If you transact through the platform, we may collect payment or payout information (via secure third-party processors such as Stripe or PayPal).",
          "Communications: Any messages or inquiries you send through the platform or via support channels."
        ]
      },
      {
        title: "1.2. Information We Collect Automatically",
        content: "",
        bullets: [
          "Usage Data: Details about how you use the Platform (pages visited, time spent, features used).",
          "Device & Log Data: IP address, browser type, device type, operating system, app version, and crash logs.",
          "Location Data: If you enable location services, we may collect approximate or precise location data to show relevant gigs, collaborators, or opportunities."
        ]
      },
      {
        title: "1.3. Information from Third Parties",
        content: "We may receive data from integrated services such as:",
        bullets: [
          "Social media logins (e.g., Sign in with Apple, Google, or Spotify)",
          "Event platforms, promoters, or booking partners connected to your R/HOOD account."
        ]
      }
    ]
  },
  {
    title: "2. How We Use Your Information",
    content: "We use your information to:",
    bullets: [
      "Operate, maintain, and improve the R/HOOD platform.",
      "Match you with relevant gigs, opportunities, and collaborators.",
      "Personalize your experience and show tailored recommendations.",
      "Process payments and manage bookings.",
      "Communicate updates, security alerts, or service announcements.",
      "Enforce our Terms of Service and protect user safety."
    ]
  },
  {
    title: "3. How We Share Information",
    content: "We do not sell your data. We may share limited information in the following cases:",
    bullets: [
      "With Other Users: Your public profile and gig applications may be visible to promoters or collaborators.",
      "With Service Providers: Trusted partners who assist with hosting, analytics, payment processing, or communication (bound by confidentiality agreements).",
      "For Legal Reasons: To comply with applicable law, respond to lawful requests, or protect rights, property, and safety.",
      "Business Transfers: In the event of a merger, acquisition, or sale, user information may be transferred under the same privacy protections."
    ]
  },
  {
    title: "4. Data Retention",
    content: "We retain personal data only as long as necessary to provide our services or comply with legal obligations. You can delete your account at any time, which will permanently remove your data (subject to any legal retention requirements)."
  },
  {
    title: "5. Your Rights",
    content: "Depending on your region, you may have the right to:",
    bullets: [
      "Access, correct, or delete your personal data.",
      "Object to or restrict certain processing.",
      "Withdraw consent at any time.",
      "Request a copy of your data in a portable format."
    ]
  },
  {
    title: "6. Security",
    content: "We use industry-standard encryption, secure data storage, and access controls to protect your data. However, no online service is 100% secure, so we encourage you to use a strong password and be mindful of what you share publicly."
  },
  {
    title: "7. Children's Privacy",
    content: "R/HOOD is not intended for individuals under 16. We do not knowingly collect data from minors. If you believe a child has provided personal data, contact us immediately."
  },
  {
    title: "8. International Transfers",
    content: "R/HOOD operates globally. By using our Platform, you agree that your data may be transferred and processed outside your home country, subject to applicable data protection laws (e.g., GDPR, CCPA)."
  },
  {
    title: "9. Updates to This Policy",
    content: "We may update this Privacy Policy from time to time. The latest version will always be posted on our website or app, with the \"Effective Date\" updated accordingly."
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
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
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
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
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
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    fontWeight: "600",
    color: "hsl(0, 0%, 95%)",
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
    fontFamily: "TS-Block-Bold",
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
