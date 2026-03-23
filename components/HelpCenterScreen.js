import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";

const SUPPORT_EMAIL = "hello@rhood.io";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Help Request")}`;

async function openMailtoSupport() {
  try {
    let can = true;
    try {
      can = await Linking.canOpenURL(SUPPORT_MAILTO);
    } catch {
      can = true;
    }
    if (can) {
      await Linking.openURL(SUPPORT_MAILTO);
    } else {
      Alert.alert(
        "Email support",
        `Send a message to ${SUPPORT_EMAIL} from your mail app.`
      );
    }
  } catch {
    Alert.alert(
      "Email support",
      `We couldn't open your mail app. Email us at ${SUPPORT_EMAIL}.`
    );
  }
}

/** Rich FAQ copy: plain string, or an array of strings and { label, href } link objects. */
function RichAnswerText({ segments, textStyle, linkStyle, onLinkPress }) {
  if (segments == null) return null;
  if (typeof segments === "string") {
    return <Text style={textStyle}>{segments}</Text>;
  }
  if (!Array.isArray(segments)) return null;

  return (
    <Text style={textStyle}>
      {segments.map((seg, index) => {
        if (typeof seg === "string") {
          return seg;
        }
        if (seg && typeof seg === "object" && seg.label && seg.href) {
          return (
            <Text
              key={index}
              style={linkStyle}
              onPress={() => onLinkPress?.(seg.href)}
            >
              {seg.label}
            </Text>
          );
        }
        return null;
      })}
    </Text>
  );
}

const FaqItem = memo(function FaqItem({ item, expanded, onToggle }) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => onToggle(item.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={item.question}
      >
        <Text style={styles.questionText}>{item.question}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="hsl(75, 100%, 60%)"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqAnswer}>
          <RichAnswerText
            segments={item.answer}
            textStyle={styles.answerText}
            linkStyle={styles.linkText}
            onLinkPress={(href) => {
              if (href.startsWith("mailto:")) {
                openMailtoSupport();
              } else {
                Linking.openURL(href).catch(() => {
                  Alert.alert("Unable to open link", "Please try again later.");
                });
              }
            }}
          />
          {item.bullets && (
            <View style={styles.bulletList}>
              {item.bullets.map((bullet, index) => (
                <View key={index} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <View style={styles.bulletTextWrap}>
                    <RichAnswerText
                      segments={bullet}
                      textStyle={styles.bulletText}
                      linkStyle={styles.linkText}
                      onLinkPress={(href) => {
                        if (href.startsWith("mailto:")) {
                          openMailtoSupport();
                        } else {
                          Linking.openURL(href).catch(() => {
                            Alert.alert(
                              "Unable to open link",
                              "Please try again later."
                            );
                          });
                        }
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

export default function HelpCenterScreen({ onBack, onNavigate }) {
  const insets = useSafeAreaInsets();
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const headerPaddingTop = Math.max(SPACING.lg, insets.top);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticPatterns.backButton();
            onBack();
          }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Ionicons name="help-circle" size={60} color="hsl(75, 100%, 60%)" />
          <Text style={styles.title}>How can we help you?</Text>
          <Text style={styles.subtitle}>
            Find answers to common questions and learn how to get the most out
            of R/HOOD
          </Text>
        </View>

        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <TouchableOpacity
            style={[styles.quickLinkCard, styles.primaryQuickLinkCard]}
            onPress={() => onNavigate?.("help-chat")}
            accessibilityRole="button"
            accessibilityLabel="Chat with support"
          >
            <Ionicons name="chatbubbles" size={24} color="hsl(75, 100%, 60%)" />
            <View style={styles.quickLinkContent}>
              <Text style={styles.quickLinkTitle}>Chat with Support</Text>
              <Text style={styles.quickLinkSubtitle}>
                Get instant help from our support bot
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="hsl(0, 0%, 50%)"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={openMailtoSupport}
            accessibilityRole="button"
            accessibilityLabel="Email support"
          >
            <Ionicons name="mail" size={24} color="hsl(75, 100%, 60%)" />
            <View style={styles.quickLinkContent}>
              <Text style={styles.quickLinkTitle}>Email Support</Text>
              <Text style={styles.quickLinkSubtitle}>
                Send us an email directly
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="hsl(0, 0%, 50%)"
            />
          </TouchableOpacity>
        </View>

        {helpSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.questions.map((item) => (
              <FaqItem
                key={item.id}
                item={item}
                expanded={!!expandedSections[item.id]}
                onToggle={toggleSection}
              />
            ))}
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            Our support team is here to help you with any questions or issues.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={openMailtoSupport}
            accessibilityRole="button"
            accessibilityLabel="Email support"
          >
            <Ionicons name="mail" size={20} color="hsl(0, 0%, 0%)" />
            <Text style={styles.contactButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>R/HOOD Help Center</Text>
          <Text style={styles.footerSubtext}>
            Connecting DJs with Opportunities
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const LINK = { label: "contact our support team", href: SUPPORT_MAILTO };
const LINK_SHORT = { label: "contact support", href: SUPPORT_MAILTO };

const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    questions: [
      {
        id: "what-is-rhood",
        question: "What is R/HOOD?",
        answer:
          "R/HOOD is a platform designed to connect DJs, producers, promoters, and event organizers. We help you discover opportunities, build your network, and grow your career in the music industry.",
      },
      {
        id: "create-account",
        question: "How do I create an account?",
        answer: "You can create an account by:",
        bullets: [
          "Signing up with your email and password",
          "Using Sign in with Apple",
          "Using Sign in with Google",
          "After signing up, complete your profile with your DJ name, genre preferences, and professional information",
        ],
      },
      {
        id: "complete-profile",
        question: "How do I complete my profile?",
        answer:
          "After creating your account, you'll be guided through our onboarding process where you can add:",
        bullets: [
          "Your DJ name and real name",
          "Music genre preferences",
          "City/location",
          "Social media links (Instagram, SoundCloud)",
          "Bio and professional information",
        ],
      },
    ],
  },
  {
    id: "opportunities",
    title: "Opportunities & Gigs",
    questions: [
      {
        id: "find-opportunities",
        question: "How do I find opportunities?",
        answer:
          "Browse opportunities on the home screen. You can swipe right to apply or left to pass on opportunities that match your profile and preferences.",
      },
      {
        id: "apply-gig",
        question: "How do I apply for a gig?",
        answer:
          "To apply for a gig, swipe right on the opportunity card or tap the apply button. You can customize your application with a personal message to the organizer.",
      },
      {
        id: "track-applications",
        question: "How do I track my applications?",
        answer:
          "View all your applications and their status in the Connections section. You'll receive notifications when organizers respond to your applications.",
      },
    ],
  },
  {
    id: "profile-music",
    title: "Profile & Music",
    questions: [
      {
        id: "upload-mix",
        question: "How do I upload my mixes?",
        answer:
          "Go to your profile and tap 'Upload Mix'. You can upload audio files and add details like title, genre, and description to showcase your work.",
      },
      {
        id: "edit-profile",
        question: "How do I edit my profile?",
        answer:
          "Tap on your profile icon, then select 'Edit Profile' to update your information, social links, bio, and genre preferences.",
      },
      {
        id: "add-social-links",
        question: "Can I add my social media links?",
        answer:
          "Yes! You can add links to your Instagram, SoundCloud, and other platforms in your profile settings. This helps promoters discover more of your work.",
      },
    ],
  },
  {
    id: "connections",
    title: "Connections & Networking",
    questions: [
      {
        id: "connect-djs",
        question: "How do I connect with other DJs?",
        answer:
          "Use the Discover tab to browse profiles of other DJs, producers, and industry professionals. Send connection requests to expand your network.",
      },
      {
        id: "messaging",
        question: "How do I message someone?",
        answer:
          "Once you're connected with someone, you can send direct messages through the Messages section. Use this to collaborate, share tips, or discuss opportunities.",
      },
      {
        id: "view-profiles",
        question: "How do I view someone's profile?",
        answer:
          "Tap on any user's name or profile picture to view their full profile, including their mixes, bio, and social links.",
      },
    ],
  },
  {
    id: "account-settings",
    title: "Account & Settings",
    questions: [
      {
        id: "notifications",
        question: "How do I manage notifications?",
        answer:
          "Go to Settings > Notifications to customize which notifications you receive. You can control push notifications, message alerts, and community updates.",
      },
      {
        id: "change-password",
        question: "How do I change my password?",
        answer:
          "If you signed up with email, you can request a password reset by signing out and tapping 'Forgot Password' on the login screen.",
      },
      {
        id: "delete-account",
        question: "How do I delete my account?",
        answer: [
          "To delete your account, please ",
          LINK,
          ". We'll help you through the process and answer any questions.",
        ],
      },
      {
        id: "privacy",
        question: "How is my data protected?",
        answer:
          "We take your privacy seriously. All data is encrypted and stored securely. Read our Privacy Policy in Settings for full details on how we protect your information.",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    questions: [
      {
        id: "login-issues",
        question: "I'm having trouble logging in",
        answer: "If you're having login issues:",
        bullets: [
          "Make sure you're using the correct email and password",
          "Try resetting your password if you forgot it",
          "Check your internet connection",
          "If using social sign-in, make sure you're using the same account you signed up with",
          [
            "If the problem persists, ",
            LINK_SHORT,
            " and we'll help.",
          ],
        ],
      },
      {
        id: "app-crashes",
        question: "The app keeps crashing",
        answer: "Try these steps:",
        bullets: [
          "Close and restart the app",
          "Check for app updates in the App Store",
          "Restart your device",
          "Make sure you have the latest iOS/Android version",
          [
            "Still stuck? ",
            LINK_SHORT,
            " with details about when the crash happens.",
          ],
        ],
      },
      {
        id: "audio-not-playing",
        question: "Audio isn't playing",
        answer: "If mixes aren't playing:",
        bullets: [
          "Check your internet connection",
          "Make sure your device volume is up",
          "Try closing and reopening the app",
          "Check if other audio apps work on your device",
          [
            "If the issue continues, ",
            LINK_SHORT,
            " and we'll take a look.",
          ],
        ],
      },
    ],
  },
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
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
  },
  quickLinksSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: "hsl(75, 100%, 60%)",
    marginBottom: SPACING.md,
  },
  quickLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    marginBottom: SPACING.sm,
  },
  primaryQuickLinkCard: {
    borderColor: "hsl(75, 100%, 60%)",
    borderWidth: 2,
  },
  quickLinkContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  quickLinkTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  quickLinkSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  section: {
    marginBottom: SPACING.xl,
  },
  faqItem: {
    marginBottom: SPACING.sm,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "TS Block Bold",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginRight: SPACING.sm,
  },
  faqAnswer: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  answerText: {
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
  bulletTextWrap: {
    flex: 1,
  },
  bulletText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 20,
  },
  linkText: {
    color: "hsl(75, 100%, 60%)",
    textDecorationLine: "underline",
  },
  contactSection: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    alignItems: "center",
  },
  contactTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: SPACING.sm,
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
  },
  contactButtonText: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
    marginLeft: SPACING.sm,
  },
  footer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
  },
});
