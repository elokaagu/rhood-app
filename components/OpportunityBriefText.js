import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, TYPOGRAPHY, SPACING } from "../lib/sharedStyles";
import { parseBriefDescription, parseInlineBold } from "../lib/opportunityBrief";

const identity = (text) => text;

/**
 * Opportunity brief text: keeps line breaks, renders **bold**, and styles the
 * template headings ("The opportunity", "What we want back", ...).
 * `renderInline` handles plain runs (e.g. turning URLs into links).
 */
export default function OpportunityBriefText({ text, renderInline = identity, style }) {
  const blocks = parseBriefDescription(text);
  if (blocks.length === 0) return null;

  return (
    <View style={style}>
      {blocks.map((block, i) => {
        if (block.type === "gap") {
          return <View key={`gap-${i}`} style={styles.gap} />;
        }
        if (block.type === "heading") {
          return (
            <Text
              key={`heading-${i}`}
              style={[styles.heading, i > 0 && styles.headingSpacing]}
              accessibilityRole="header"
            >
              {block.text}
            </Text>
          );
        }
        return (
          <Text key={`line-${i}`} style={styles.line}>
            {parseInlineBold(block.text).map((seg, j) =>
              seg.bold ? (
                <Text key={j} style={styles.bold}>
                  {renderInline(seg.text)}
                </Text>
              ) : (
                <React.Fragment key={j}>{renderInline(seg.text)}</React.Fragment>
              )
            )}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.weightBold,
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  headingSpacing: {
    marginTop: SPACING.xs,
  },
  line: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: TYPOGRAPHY.weightBold,
    color: COLORS.textPrimary,
  },
  gap: {
    height: SPACING.sm,
  },
});
