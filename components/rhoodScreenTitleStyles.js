/**
 * Canonical “hero” title + subtitle for main tab surfaces (Listen, Connections, Opportunities, etc.).
 * Keep in sync across screens — use {@link RhoodScreenTitleBlock}.
 */
import { StyleSheet } from "react-native";
import { FONT_BODY, FONT_HEADING } from "./connectionsStyles/tokens";

export const rhoodScreenTitleStyles = StyleSheet.create({
  heroRoot: {
    width: "100%",
  },
  /** Thin separator (e.g. first section below Listen header) */
  heroTopRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "hsl(0, 0%, 20%)",
    marginBottom: 16,
    alignSelf: "stretch",
  },
  /** Slightly compact so long words (e.g. OPPORTUNITIES) stay one line on typical phones */
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: FONT_HEADING,
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.75,
  },
  /** Title + trailing control (e.g. “See all”) */
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  heroTitleInRow: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  heroTitleRight: {
    flexShrink: 0,
    paddingTop: 2,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
  },
});
