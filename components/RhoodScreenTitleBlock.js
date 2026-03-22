import React from "react";
import { View, Text } from "react-native";
import { rhoodScreenTitleStyles as styles } from "./rhoodScreenTitleStyles";

/**
 * Shared screen hero: uppercase TS Block title + muted subtitle.
 * Use inside a parent that already applies horizontal padding (e.g. `padding: 20`).
 *
 * @param {string} title — shown uppercase
 * @param {React.ReactNode} [subtitle] — string or inline elements (nested <Text> ok)
 * @param {React.ReactNode} [titleRight] — e.g. “See all” button, aligned with title row
 * @param {boolean} [showTopRule] — hairline above title (section stacks)
 * @param {number} [subtitleBottomSpacing=16] — space before next row (tabs, search, etc.)
 */
export default function RhoodScreenTitleBlock({
  title,
  subtitle,
  titleRight,
  showTopRule = false,
  subtitleBottomSpacing = 16,
  style,
  titleStyle,
  subtitleStyle,
  children,
}) {
  const t = (title ?? "").trim();
  const hasSubtitle =
    subtitle != null &&
    (typeof subtitle !== "string" || String(subtitle).trim() !== "");
  const hasTitleRight = titleRight != null;

  const titleText = t ? (
    <Text
      style={[
        styles.heroTitle,
        hasTitleRight && styles.heroTitleInRow,
        titleStyle,
      ]}
      accessibilityRole="header"
      numberOfLines={2}
      adjustsFontSizeToFit={!!t && t.length > 11}
      minimumFontScale={0.82}
    >
      {t.toUpperCase()}
    </Text>
  ) : null;

  return (
    <View style={[styles.heroRoot, style]}>
      {showTopRule ? <View style={styles.heroTopRule} /> : null}
      {t && hasTitleRight ? (
        <View style={styles.heroTitleRow}>
          {titleText}
          <View style={styles.heroTitleRight}>{titleRight}</View>
        </View>
      ) : (
        titleText
      )}
      {hasSubtitle ? (
        <View style={{ marginBottom: subtitleBottomSpacing }}>
          <Text style={[styles.heroSubtitle, subtitleStyle]}>{subtitle}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}
