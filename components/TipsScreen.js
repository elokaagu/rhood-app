import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * DJ career resource hub. Static, curated guides shown as an expandable list.
 * Each guide has a short intro and a set of practical, skimmable points.
 */
const TIP_GUIDES = [
  {
    id: "how-to-dj",
    icon: "disc",
    title: "How to DJ correctly",
    summary: "The fundamentals every DJ should nail first.",
    intro:
      "Great DJing is about smooth, intentional transitions and reading energy — not flashy tricks. Master these basics before anything else.",
    sections: [
      {
        heading: "Beatmatching & sync",
        points: [
          "Learn to beatmatch by ear first, then use sync as a safety net — not a crutch.",
          "Match tempo (BPM) and align the downbeats so kicks land together.",
          "Use the pitch fader for fine tempo nudges; ride the jog wheel to correct drift.",
        ],
      },
      {
        heading: "Phrasing",
        points: [
          "Dance tracks are built in 8, 16 and 32-beat phrases. Start transitions at the top of a phrase.",
          "Count bars so your blends land musically, not mid-phrase.",
        ],
      },
      {
        heading: "EQ & mixing",
        points: [
          "Swap basslines using the low EQ — never run two kicks at full bass together (it sounds muddy).",
          "Bring the incoming track in on highs/mids, then trade the lows on the switch.",
          "Use the channel fader and trim to keep levels even; watch the master stays out of the red.",
        ],
      },
    ],
  },
  {
    id: "set-routine",
    icon: "trending-up",
    title: "Planning a set routine",
    summary: "Structure an energy curve that keeps the floor moving.",
    intro:
      "A memorable set tells a story. Plan a shape, but stay flexible enough to react to the room.",
    sections: [
      {
        heading: "Build an energy arc",
        points: [
          "Open lower and groovier to warm the room — don't peak too early.",
          "Build tension gradually, drop your biggest moments two-thirds in, then bring it home.",
          "Vary energy in waves; constant peak-time gets exhausting and flattens the floor.",
        ],
      },
      {
        heading: "Track selection",
        points: [
          "Prepare more music than you need and tag tracks by energy and key.",
          "Group tracks into harmonic-key families for smooth, clash-free blends.",
          "Have a few 'rescue' tracks you can trust to refill the floor.",
        ],
      },
      {
        heading: "Know your slot",
        points: [
          "Warm-up ≠ peak time. Respect the DJ after you and set the room up, don't blow it open.",
          "Headlining? Take more risks and show your signature sound.",
        ],
      },
    ],
  },
  {
    id: "reading-the-room",
    icon: "people",
    title: "Reading the room",
    summary: "React to the crowd in real time.",
    intro:
      "The best DJs watch the floor as much as the decks. Your planned set is a starting point, not a script.",
    sections: [
      {
        heading: "Watch and adjust",
        points: [
          "Eyes up: are people moving, talking, or leaving? Adjust energy accordingly.",
          "If a track empties the floor, don't ride it out — mix out early.",
          "When something lands, lean into that vibe for a few tracks before switching gears.",
        ],
      },
      {
        heading: "Context matters",
        points: [
          "Time of night, venue size and crowd age all change what works.",
          "Festival main stage vs. intimate basement demand very different approaches.",
        ],
      },
    ],
  },
  {
    id: "rider",
    icon: "document-text",
    title: "Creating a rider",
    summary: "What to ask for — technical and hospitality.",
    intro:
      "A rider tells the promoter exactly what you need to perform at your best. Keep it clear, reasonable, and professional.",
    sections: [
      {
        heading: "Technical rider",
        points: [
          "List your preferred setup: e.g. 2× Pioneer CDJ-3000 + DJM-900NXS2, or your controller + table space and power.",
          "Specify a working monitor, USB/link cabling, and a booth that's stable and at the right height.",
          "Note your media format (USB, laptop + DVS) and any adapters you'll need.",
        ],
      },
      {
        heading: "Hospitality rider",
        points: [
          "Reasonable essentials: drinks/water, a meal, and guest-list spots.",
          "Travel & accommodation if you're touring in — agree this in writing up front.",
          "Keep requests proportional to the fee and the gig size; reputation matters.",
        ],
      },
      {
        heading: "Logistics",
        points: [
          "Confirm set time, set length, load-in time and contact person.",
          "Include your fee, payment terms, and who covers travel.",
        ],
      },
    ],
  },
  {
    id: "brand",
    icon: "sparkles",
    title: "Building your brand",
    summary: "Stand out and be bookable.",
    intro:
      "Promoters book DJs they can find, trust and picture on their lineup. Make that easy.",
    sections: [
      {
        heading: "Your presence",
        points: [
          "Keep a consistent name, logo and photo across platforms — including your R/HOOD profile.",
          "Post regularly: clips of sets, track IDs, behind-the-scenes. Show your sound.",
          "Record and share mixes so promoters can hear exactly what you do.",
        ],
      },
      {
        heading: "Press kit (EPK)",
        points: [
          "A short bio, a great photo, links to mixes, and notable gigs/releases.",
          "Make it one easy link you can send instantly when asked.",
        ],
      },
    ],
  },
  {
    id: "getting-booked",
    icon: "briefcase",
    title: "Getting booked & networking",
    summary: "Turn skill into gigs.",
    intro:
      "Bookings come from a mix of great music, reliability and relationships. Be someone promoters want to work with again.",
    sections: [
      {
        heading: "Get on the radar",
        points: [
          "Apply to opportunities on R/HOOD and send tailored, concise demos.",
          "Support local nights, meet promoters and other DJs in person.",
          "Offer warm-up sets — they're how most residents start.",
        ],
      },
      {
        heading: "Be professional",
        points: [
          "Reply quickly, show up early, and deliver the slot you were booked for.",
          "Promote your gigs — promoters love a DJ who brings a crowd.",
          "Say thanks and stay in touch; repeat bookings build a career.",
        ],
      },
    ],
  },
];

function TipCard({ guide, expanded, onToggle }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${guide.title}, ${expanded ? "collapse" : "expand"}`}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={guide.icon} size={22} color="hsl(75, 100%, 60%)" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{guide.title}</Text>
          <Text style={styles.cardSummary}>{guide.summary}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="hsl(0, 0%, 55%)"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.intro}>{guide.intro}</Text>
          {guide.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              {section.points.map((point, i) => (
                <View key={i} style={styles.pointRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TipsScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState(TIP_GUIDES[0].id);

  const toggle = useCallback((id) => {
    HapticPatterns.itemPress();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={() => {
              HapticPatterns.itemPress();
              onBack();
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color="hsl(75, 100%, 60%)" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Tips</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: insets.bottom + SPACING.xl * 2,
          paddingHorizontal: SPACING.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="bulb" size={52} color="hsl(75, 100%, 60%)" />
          <Text style={styles.heroTitle}>Level up your craft</Text>
          <Text style={styles.heroSubtitle}>
            Practical guides to help you DJ better and build your career — from
            mixing fundamentals to riders, set planning and getting booked.
          </Text>
        </View>

        {TIP_GUIDES.map((guide) => (
          <TipCard
            key={guide.id}
            guide={guide}
            expanded={expandedId === guide.id}
            onToggle={() => toggle(guide.id)}
          />
        ))}
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
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "hsl(0, 0%, 18%)",
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  heroTitle: {
    marginTop: SPACING.md,
    fontSize: 22,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
  },
  card: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
  },
  cardSummary: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 55%)",
    lineHeight: 18,
  },
  cardBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "hsl(0, 0%, 15%)",
    paddingTop: SPACING.md,
  },
  intro: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 72%)",
    lineHeight: 21,
    marginBottom: SPACING.md,
  },
  section: {
    marginTop: SPACING.md,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "hsl(0, 0%, 50%)",
    marginTop: 7,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 20,
  },
});
